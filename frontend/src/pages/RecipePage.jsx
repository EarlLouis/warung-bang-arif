import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, Clock, History, DollarSign, CheckCircle2, 
  Edit3, Plus, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import { fetchApi, formatRupiah } from '../utils/api';
import FoodThumbnail from '../components/FoodThumbnail';

export default function RecipePage({ currentUser }) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState([]);

  // Form revision state
  const [revInstructions, setRevInstructions] = useState('');
  const [revMarination, setRevMarination] = useState(120);
  const [revTaste, setRevTaste] = useState('');
  const [revSopNotes, setRevSopNotes] = useState('');
  const [revIngredients, setRevIngredients] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/recipes');
      setRecipes(data);
      if (data.length > 0 && !selectedRecipe) {
        setSelectedRecipe(data[0]);
      } else if (selectedRecipe) {
        const found = data.find(d => d.id === selectedRecipe.id);
        if (found) setSelectedRecipe(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = async () => {
    try {
      const data = await fetchApi('/inventory/ingredients');
      setAvailableIngredients(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRecipes();
    loadIngredients();
  }, []);

  const openReviseModal = () => {
    if (!selectedRecipe) return;
    setRevInstructions(selectedRecipe.instructions);
    setRevMarination(selectedRecipe.marination_time_minutes || 120);
    setRevTaste(selectedRecipe.taste_profile || '');
    setRevSopNotes(selectedRecipe.sop_notes || '');
    setRevIngredients(
      selectedRecipe.ingredients.map(ing => ({
        ingredientId: ing.ingredient_id,
        name: ing.ingredient_name,
        unit: ing.unit,
        amountRequired: ing.amount_required
      }))
    );
    setShowReviseModal(true);
  };

  const handleUpdateIngredientAmount = (index, newAmount) => {
    const next = [...revIngredients];
    next[index].amountRequired = parseFloat(newAmount || 0);
    setRevIngredients(next);
  };

  const handleAddIngredientToRevision = (ingredient) => {
    if (revIngredients.some(i => i.ingredientId === ingredient.id)) return;
    setRevIngredients([
      ...revIngredients,
      {
        ingredientId: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        amountRequired: 1
      }
    ]);
  };

  const handleRemoveIngredientFromRevision = (index) => {
    const next = [...revIngredients];
    next.splice(index, 1);
    setRevIngredients(next);
  };

  const handleSaveRevision = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/recipes/revise', {
        method: 'POST',
        body: JSON.stringify({
          menuId: selectedRecipe.menu_id,
          instructions: revInstructions,
          marinationTimeMinutes: parseInt(revMarination, 10),
          platingPhotoUrl: selectedRecipe.plating_photo_url,
          tasteProfile: revTaste,
          sopNotes: revSopNotes,
          ingredients: revIngredients,
          checklists: selectedRecipe.checklists || [],
          userId: currentUser?.id || 1
        })
      });

      alert('Revisi Resep & SOP berhasil disimpan sebagai versi terbaru!');
      setShowReviseModal(false);
      loadRecipes();
    } catch (err) {
      alert('Gagal menyimpan revisi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Resep & SOP Digital</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Standarisasi Resep & Pengendalian HPP Otomatis
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
            Menjamin cita rasa konsisten, marinasi tepat 2 jam di freezer/vacuum, takaran madu presisi, dan kalkulasi HPP otomatis.
          </p>
        </div>

        {currentUser?.role === 'OWNER' && selectedRecipe && (
          <button
            onClick={openReviseModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-sm transition"
          >
            <Edit3 className="w-4 h-4" />
            <span>Revisi / Buat Versi Baru Resep</span>
          </button>
        )}
      </div>

      {/* Main Grid: Recipe List on Left & Selected Recipe on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recipe Catalog Cards */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider px-1">
            Katalog Menu & Resep Aktif
          </h3>
          <div className="space-y-2">
            {recipes.map((r) => {
              const isSelected = selectedRecipe?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 shadow-sm ring-2 ring-blue-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                      <FoodThumbnail code={r.menu_code} name={r.menu_name} imageUrl={r.plating_photo_url} className="h-12 text-xl p-1" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">{r.menu_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                          Versi #{r.version}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">{r.menu_category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs text-slate-800">{formatRupiah(r.sell_price)}</div>
                    <div className="text-[10px] text-emerald-600 font-bold">HPP: {formatRupiah(r.calculated_hpp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Recipe Viewer */}
        {selectedRecipe && (
          <div className="lg:col-span-2 space-y-6">
            {/* Overview & Plating Banner */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="relative h-44 sm:h-52 w-full">
                <FoodThumbnail code={selectedRecipe.menu_code} name={selectedRecipe.menu_name} imageUrl={selectedRecipe.plating_photo_url} className="h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase">
                      Versi Aktif #{selectedRecipe.version}
                    </span>
                    <span className="text-xs text-gold-200">
                      Diperbarui: {new Date(selectedRecipe.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">{selectedRecipe.menu_name}</h3>
                  <p className="text-xs text-white/85 mt-1 max-w-xl line-clamp-2">
                    {selectedRecipe.taste_profile}
                  </p>
                </div>
              </div>

              {/* HPP & Margin Financial Stats */}
              <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Harga Jual Menu</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {formatRupiah(selectedRecipe.sell_price)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">HPP Bahan Baku (BOM)</div>
                  <div className="text-base sm:text-lg font-black text-blue-700 mt-0.5">
                    {formatRupiah(selectedRecipe.calculated_hpp)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Laba Kotor Per Porsi</div>
                  <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                    {formatRupiah(selectedRecipe.margin_nominal)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Margin Keuntungan</div>
                  <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                    {selectedRecipe.margin_percentage}%
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* SOP Critical Notes (Anti-Over Sweetness) */}
                {selectedRecipe.sop_notes && (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider">
                        SOP Kritis Dapur (Pencegahan Komplain)
                      </h4>
                      <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                        {selectedRecipe.sop_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bill of Materials (BOM) Ingredients */}
                <div>
                  <h4 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2">
                    <span>📋</span>
                    <span>Takaran Bahan Baku & Komponen HPP Per Porsi</span>
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Nama Bahan Baku</th>
                          <th className="p-3">Takaran Resep</th>
                          <th className="p-3">Harga Beli Terakhir</th>
                          <th className="p-3 text-right">Subtotal HPP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecipe.ingredients.map((ing) => (
                          <tr key={ing.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-800">{ing.ingredient_name}</td>
                            <td className="p-3 text-slate-600 font-semibold">
                              {ing.amount_required} {ing.unit}
                            </td>
                            <td className="p-3 text-slate-500">
                              {formatRupiah(ing.last_buy_price)} / {ing.unit}
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">
                              {formatRupiah(ing.item_hpp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step-by-Step Cooking & Marinating Instructions */}
                <div>
                  <h4 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2">
                    <span>🔥</span>
                    <span>Instruksi Tahapan Memasak & Standar Plating</span>
                  </h4>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                    {selectedRecipe.instructions}
                  </div>
                </div>

                {/* SOP Dapur Verification Checklist */}
                <div>
                  <h4 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2">
                    <span>✅</span>
                    <span>Checklist SOP Dapur Sebelum Disajikan</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedRecipe.checklists.map((chk) => (
                      <div key={chk.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>{chk.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-6">{chk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revision Modal */}
      {showReviseModal && selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  Revisi Resep Baku: {selectedRecipe.menu_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Akan diterbitkan sebagai <strong>Versi #{selectedRecipe.version + 1}</strong> dengan catatan audit.
                </p>
              </div>
              <button
                onClick={() => setShowReviseModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Profil Rasa
                </label>
                <input
                  type="text"
                  value={revTaste}
                  onChange={(e) => setRevTaste(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan SOP Evaluasi (Misal: Koreksi Takaran Madu) *
                </label>
                <input
                  type="text"
                  required
                  value={revSopNotes}
                  onChange={(e) => setRevSopNotes(e.target.value)}
                  placeholder="Contoh: Takaran olesan madu dikurangi dari 30ml ke 20ml menindaklanjuti komplain rasa"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Waktu Marinasi Minimal (Menit)
                </label>
                <input
                  type="number"
                  value={revMarination}
                  onChange={(e) => setRevMarination(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Komposisi Takaran Bahan Baku
                </label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {revIngredients.map((ing, idx) => (
                    <div key={ing.ingredientId} className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-xs text-slate-800 flex-1">{ing.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.001"
                          value={ing.amountRequired}
                          onChange={(e) => handleUpdateIngredientAmount(idx, e.target.value)}
                          className="w-20 px-2 py-1 rounded border border-slate-300 text-xs text-right font-bold"
                        />
                        <span className="text-[11px] text-slate-500 w-12">{ing.unit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientFromRevision(idx)}
                        className="text-red-500 text-xs font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="pt-2 flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const id = parseInt(e.target.value, 10);
                        const found = availableIngredients.find(i => i.id === id);
                        if (found) handleAddIngredientToRevision(found);
                        e.target.value = '';
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="">+ Tambah Bahan Baku Ke Resep</option>
                      {availableIngredients.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Instruksi Langkah Memasak Lengkap
                </label>
                <textarea
                  rows="4"
                  value={revInstructions}
                  onChange={(e) => setRevInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono"
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Terbitkan Versi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
