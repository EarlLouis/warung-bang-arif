const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAudit } = require('./auth');

// GET /api/recipes
router.get('/', async (req, res) => {
  try {
    const [recipes] = await pool.query(`
      SELECT r.*, m.name as menu_name, m.code as menu_code, m.sell_price, m.category as menu_category
      FROM recipes r
      JOIN menus m ON r.menu_id = m.id
      WHERE r.is_active = TRUE
      ORDER BY m.category ASC, m.name ASC
    `);

    // Fetch ingredients and SOP checklists for each recipe
    for (let r of recipes) {
      const [ingredients] = await pool.query(`
        SELECT ri.*, i.name as ingredient_name, i.unit, i.last_buy_price,
               (ri.amount_required * i.last_buy_price) as item_hpp
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `, [r.id]);

      const [checklists] = await pool.query(`
        SELECT * FROM sop_checklists WHERE recipe_id = ? ORDER BY step_number ASC
      `, [r.id]);

      // Calculate total HPP for this recipe
      const calculatedHpp = ingredients.reduce((sum, ing) => sum + parseFloat(ing.item_hpp || 0), 0);

      r.ingredients = ingredients;
      r.checklists = checklists;
      r.calculated_hpp = calculatedHpp;
      r.margin_nominal = parseFloat(r.sell_price) - calculatedHpp;
      r.margin_percentage = r.sell_price > 0 ? ((r.margin_nominal / parseFloat(r.sell_price)) * 100).toFixed(1) : 0;
    }

    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const [recipes] = await pool.query(`
      SELECT r.*, m.name as menu_name, m.code as menu_code, m.sell_price, m.category as menu_category
      FROM recipes r
      JOIN menus m ON r.menu_id = m.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (recipes.length === 0) {
      return res.status(404).json({ error: 'Resep tidak ditemukan' });
    }

    const r = recipes[0];
    const [ingredients] = await pool.query(`
      SELECT ri.*, i.name as ingredient_name, i.unit, i.last_buy_price,
             (ri.amount_required * i.last_buy_price) as item_hpp
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = ?
    `, [r.id]);

    const [checklists] = await pool.query(`
      SELECT * FROM sop_checklists WHERE recipe_id = ? ORDER BY step_number ASC
    `, [r.id]);

    const calculatedHpp = ingredients.reduce((sum, ing) => sum + parseFloat(ing.item_hpp || 0), 0);

    r.ingredients = ingredients;
    r.checklists = checklists;
    r.calculated_hpp = calculatedHpp;
    r.margin_nominal = parseFloat(r.sell_price) - calculatedHpp;

    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recipes/revise (Create a new revised version)
router.post('/revise', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      menuId,
      instructions,
      marinationTimeMinutes = 120,
      platingPhotoUrl,
      tasteProfile,
      sopNotes,
      ingredients = [],
      checklists = [],
      userId
    } = req.body;

    // Get current max version
    const [curr] = await connection.query(
      'SELECT MAX(version) as max_v FROM recipes WHERE menu_id = ?',
      [menuId]
    );
    const nextVersion = (curr[0].max_v || 0) + 1;

    // Deactivate previous versions
    await connection.query(
      'UPDATE recipes SET is_active = FALSE WHERE menu_id = ?',
      [menuId]
    );

    // Insert new version
    const [resRecipe] = await connection.query(
      `INSERT INTO recipes (
        menu_id, version, instructions, marination_time_minutes, 
        plating_photo_url, taste_profile, sop_notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        menuId, nextVersion, instructions, marinationTimeMinutes,
        platingPhotoUrl || 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
        tasteProfile, sopNotes
      ]
    );

    const newRecipeId = resRecipe.insertId;

    // Insert recipe ingredients
    for (const ing of ingredients) {
      await connection.query(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount_required) VALUES (?, ?, ?)',
        [newRecipeId, ing.ingredientId, ing.amountRequired]
      );
    }

    // Insert checklists
    for (let i = 0; i < checklists.length; i++) {
      const c = checklists[i];
      await connection.query(
        'INSERT INTO sop_checklists (recipe_id, step_number, title, description) VALUES (?, ?, ?, ?)',
        [newRecipeId, i + 1, c.title, c.description || '']
      );
    }

    await connection.commit();

    await logAudit(userId || null, 'REVISI_RESEP', 'Resep Baku', `Revisi SOP Resep Menu ID ${menuId} ke Versi #${nextVersion}. Catatan: ${sopNotes || 'Pembaruan takaran bumbu'}`);

    res.status(201).json({
      message: `Resep versi #${nextVersion} berhasil diterbitkan dan diaktifkan`,
      recipeId: newRecipeId,
      version: nextVersion
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
