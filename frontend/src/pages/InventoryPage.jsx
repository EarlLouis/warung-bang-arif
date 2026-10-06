import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, AlertTriangle, ArrowDownRight, ArrowUpRight, 
  ClipboardList, TrendingUp, Search, Plus, Check, RefreshCw, Pencil, Trash2, X
} from 'lucide-react';
import { fetchApi, formatRupiah } from '../utils/api';

export default function InventoryPage({ currentUser, onNavigateTab }) {
  const [ingredients, setIngredients] = useState([]);
  const [mutations, setMutations] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'mutations', 'forecast'
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Stock Opname Modal
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [opnameItems, setOpnameItems] = useState({});
  const [opnameNotes, setOpnameNotes] = useState('');
  const [submittingOpname, setSubmittingOpname] = useState(false);

  // CRUD Bahan Baku - hanya Owner
  const isOwner = String(currentUser?.role || '').toUpperCase() === 'OWNER';
  const categories = [
    'Daging & Protein',
    'Bumbu & Rempah',
    'Minyak & Saus',
    'Bahan Pokok',
    'Kemasan & Bahan Bakar'
  ];
  const emptyIngredientForm = {
    code: '',
    name: '',
    category: categories[0],
    unit: 'kg',
    currentStock: '',
    minThreshold: '',
    lastBuyPrice: ''
  };
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [savingIngredient, setSavingIngredient] = useState(false);

  const openAddIngredient = () => {
    setEditingIngredient(null);
    setIngredientForm(emptyIngredientForm);
    setShowIngredientModal(true);
  };

  const openEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setIngredientForm({
      code: ingredient.code || '',
      name: ingredient.name || '',
      category: ingredient.category || categories[0],
      unit: ingredient.unit || 'kg',
      currentStock: ingredient.current_stock ?? '',
      minThreshold: ingredient.min_threshold ?? '',
      lastBuyPrice: ingredient.last_buy_price ?? ''
    });
    setShowIngredientModal(true);
  };

  const handleIngredientFormChange = (field, value) => {
    setIngredientForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    setSavingIngredient(true);
    try {
      const payload = {
        code: ingredientForm.code,
        name: ingredientForm.name,
        category: ingredientForm.category,
        unit: ingredientForm.unit,
        currentStock: Number(ingredientForm.currentStock || 0),
        minThreshold: Number(ingredientForm.minThreshold || 0),
        lastBuyPrice: Number(ingredientForm.lastBuyPrice || 0)
      };

      const endpoint = editingIngredient
        ? `/inventory/ingredients/${editingIngredient.id}`
        : '/inventory/ingredients';

      await fetchApi(endpoint, {
        method: editingIngredient ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      alert(editingIngredient ? 'Bahan baku berhasil diperbarui.' : 'Bahan baku berhasil ditambahkan.');
      setShowIngredientModal(false);
      setEditingIngredient(null);
      await loadData();
    } catch (err) {
      alert('Gagal menyimpan bahan baku: ' + err.message);
    } finally {
      setSavingIngredient(false);
    }
  };

  const handleDeleteIngredient = async (ingredient) => {
    if (!isOwner) return;
    const confirmed = window.confirm(
      `Hapus bahan baku "${ingredient.name}" secara permanen?\n\nData bahan dan data relasi inventori terkait (resep, mutasi stok, opname, harga supplier, dan item PO) juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      const result = await fetchApi(`/inventory/ingredients/${ingredient.id}`, { method: 'DELETE' });
      alert('Bahan baku berhasil dihapus permanen.');
      await loadData();
    } catch (err) {
      alert('Gagal menghapus bahan baku: ' + err.message);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [ings, muts, fc] = await Promise.all([
        fetchApi('/inventory/ingredients'),
        fetchApi('/inventory/mutations'),
        fetchApi('/inventory/forecast')
      ]);
      setIngredients(ings);
      setMutations(muts);
      setForecast(fc);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openOpnameModal = () => {
    const initial = {};
    ingredients.forEach(i => {
      initial[i.id] = {
        physicalStock: i.current_stock,
        reason: ''
      };
    });
    setOpnameItems(initial);
    setShowOpnameModal(true);
  };

  const handleSubmitOpname = async (e) => {
    e.preventDefault();
    setSubmittingOpname(true);
    try {
      const itemsPayload = Object.entries(opnameItems).map(([id, val]) => ({
        ingredientId: parseInt(id, 10),
        physicalStock: parseFloat(val.physicalStock),
        reason: val.reason || 'Pencocokan stok fisik'
      }));

      await fetchApi('/inventory/opname', {
        method: 'POST',
        body: JSON.stringify({
          conductedBy: currentUser?.id || 1,
          notes: opnameNotes || 'Stok Opname Rutin Warung Bang Arif',
          items: itemsPayload
        })
      });

      alert('Stok Opname berhasil dicatat dan saldo sistem telah disesuaikan!');
      setShowOpnameModal(false);
      loadData();
    } catch (err) {
      alert('Gagal menyimpan opname: ' + err.message);
    } finally {
      setSubmittingOpname(false);
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Inventori & Stok Bahan Baku</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kontrol Stok Real-Time & Mutasi Otomatis
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
            Stok otomatis terpotong saat transaksi kasir POS, peringatan threshold menipis, pencocokan opname fisik, dan estimasi kebutuhan harian.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {isOwner && (
            <button
              onClick={openAddIngredient}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bahan Baku</span>
            </button>
          )}
          <button
            onClick={openOpnameModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-sm transition"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Mulai Stok Opname Fisik</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'stock'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📦 Stok Bahan Baku Saat Ini ({ingredients.length})
        </button>

        <button
          onClick={() => setActiveTab('mutations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'mutations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📜 Kartu Mutasi Stok (Audit Masuk/Keluar)
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'forecast'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🔮 Estimasi Kebutuhan Harian (Forecasting)
        </button>
      </div>

      {/* TAB 1: Real-time Stock Cards & Table */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama bahan (Ayam, Madu, Cabai, Arang...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Kode</th>
                    <th className="p-3.5">Bahan Baku</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Sisa Stok</th>
                    <th className="p-3.5">Batas Minimum</th>
                    <th className="p-3.5">Harga Beli Terakhir</th>
                    <th className="p-3.5">Nilai Aset</th>
                    <th className="p-3.5">Status</th>
                    {isOwner && <th className="p-3.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngredients.map((ing) => {
                    const isLow = parseFloat(ing.current_stock) <= parseFloat(ing.min_threshold);
                    return (
                      <tr key={ing.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono text-slate-500 font-bold">{ing.code}</td>
                        <td className="p-3.5 font-black text-slate-900">{ing.name}</td>
                        <td className="p-3.5 text-slate-600">{ing.category}</td>
                        <td className="p-3.5 font-black text-sm">
                          <span className={isLow ? 'text-red-600' : 'text-slate-800'}>
                            {parseFloat(ing.current_stock).toLocaleString('id-ID')} {ing.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {parseFloat(ing.min_threshold).toLocaleString('id-ID')} {ing.unit}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {formatRupiah(ing.last_buy_price)} / {ing.unit}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {formatRupiah(ing.total_asset_value)}
                        </td>
                        <td className="p-3.5">
                          {isLow ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 flex items-center gap-1 w-max animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Menipis / Kritis</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 w-max inline-block">
                              Aman
                            </span>
                          )}
                        </td>
                        {isOwner && (
                          <td className="p-3.5">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditIngredient(ing)}
                                title="Edit bahan baku"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-[10px] transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteIngredient(ing)}
                                title="Hapus bahan baku"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-bold text-[10px] transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Stock Mutation Ledger */}
      {activeTab === 'mutations' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-sm text-slate-800">Buku Mutasi Keluar - Masuk Stok (Audit Trail)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Merekam secara rinci setiap pengurangan pesanan POS, penambahan barang PO, dan selisih stok opname.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Waktu</th>
                  <th className="p-3.5">Bahan</th>
                  <th className="p-3.5">Tipe</th>
                  <th className="p-3.5">Jumlah</th>
                  <th className="p-3.5">Stok Sebelum</th>
                  <th className="p-3.5">Stok Sesudah</th>
                  <th className="p-3.5">Keterangan / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mutations.map((m) => {
                  const isOut = m.mutation_type === 'OUT_POS' || m.mutation_type === 'WASTE';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-slate-500 font-mono">
                        {new Date(m.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{m.ingredient_name}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          m.mutation_type === 'IN_PO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.mutation_type === 'OUT_POS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.mutation_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-black">
                        <span className={isOut ? 'text-blue-700' : 'text-emerald-700'}>
                          {isOut ? '-' : '+'}{parseFloat(m.amount).toLocaleString('id-ID')} {m.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{parseFloat(m.previous_stock).toLocaleString('id-ID')}</td>
                      <td className="p-3.5 font-bold text-slate-800">{parseFloat(m.resulting_stock).toLocaleString('id-ID')}</td>
                      <td className="p-3.5 text-slate-600 italic">{m.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Demand Forecast */}
      {activeTab === 'forecast' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Perkiraan Kebutuhan Harian & Ketahanan Stok (Forecasting)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Berdasarkan riwayat pemakaian resep pada transaksi 7 hari terakhir. Membantu Owner merencanakan jadwal belanja agar bahan tidak basi/waste dan tidak kehabisan mendadak.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {forecast.map((fc) => (
              <div key={fc.ingredient_id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{fc.name}</h4>
                    <span className="text-[10px] text-slate-500">{fc.code}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    fc.days_stock_remaining <= 2
                      ? 'bg-red-100 text-red-700'
                      : fc.days_stock_remaining <= 5
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Tahan {fc.days_stock_remaining} Hari
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Stok Saat Ini:</span>
                    <span className="font-bold text-slate-800">{parseFloat(fc.current_stock).toLocaleString('id-ID')} {fc.unit}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Rata-rata Pemakaian/Hari:</span>
                    <span className="font-bold text-blue-700">{parseFloat(fc.avg_daily_usage).toFixed(1)} {fc.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRUD Bahan Baku Modal - Owner */}
      {showIngredientModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  {editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {editingIngredient
                    ? 'Perbarui informasi bahan. Perubahan stok akan otomatis dicatat pada kartu mutasi.'
                    : 'Tambahkan bahan baku baru ke inventori. Semua field bertanda wajib diisi.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIngredientModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kode Bahan *</label>
                  <input
                    required
                    type="text"
                    value={ingredientForm.code}
                    onChange={(e) => handleIngredientFormChange('code', e.target.value.toUpperCase())}
                    placeholder="ING-21"
                    maxLength={20}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Bahan *</label>
                  <input
                    required
                    type="text"
                    value={ingredientForm.name}
                    onChange={(e) => handleIngredientFormChange('name', e.target.value)}
                    placeholder="Contoh: Minyak Goreng"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori *</label>
                  <select
                    required
                    value={ingredientForm.category}
                    onChange={(e) => handleIngredientFormChange('category', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Satuan *</label>
                  <input
                    required
                    type="text"
                    value={ingredientForm.unit}
                    onChange={(e) => handleIngredientFormChange('unit', e.target.value)}
                    placeholder="kg, gram, liter, pcs"
                    maxLength={20}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Stok Saat Ini</label>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={ingredientForm.currentStock}
                    onChange={(e) => handleIngredientFormChange('currentStock', e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Batas Minimum</label>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={ingredientForm.minThreshold}
                    onChange={(e) => handleIngredientFormChange('minThreshold', e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Harga Beli Terakhir (Rp)</label>
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={ingredientForm.lastBuyPrice}
                    onChange={(e) => handleIngredientFormChange('lastBuyPrice', e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowIngredientModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingIngredient}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingIngredient ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Check className="w-4 h-4" /> {editingIngredient ? 'Simpan Perubahan' : 'Tambah Bahan'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Opname Modal */}
      {showOpnameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Stok Opname Rutin (Pencocokan Fisik)</h3>
                <p className="text-xs text-slate-500">
                  Masukkan hasil hitungan fisik riil di gudang / chiller / freezer. Sistem akan otomatis mencatat selisih dan melakukan audit penyesuaian.
                </p>
              </div>
              <button
                onClick={() => setShowOpnameModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOpname} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Sesi Opname
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Stok opname penutupan shift malam / mingguan"
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="p-3">Bahan Baku</th>
                      <th className="p-3">Stok Sistem</th>
                      <th className="p-3">Hitungan Fisik</th>
                      <th className="p-3">Selisih</th>
                      <th className="p-3">Alasan Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ingredients.map((ing) => {
                      const itemVal = opnameItems[ing.id] || { physicalStock: ing.current_stock, reason: '' };
                      const diff = parseFloat(itemVal.physicalStock || 0) - parseFloat(ing.current_stock);

                      return (
                        <tr key={ing.id}>
                          <td className="p-3 font-bold text-slate-800">{ing.name} ({ing.unit})</td>
                          <td className="p-3 text-slate-500 font-mono">{parseFloat(ing.current_stock).toLocaleString('id-ID')}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={itemVal.physicalStock}
                              onChange={(e) => {
                                setOpnameItems({
                                  ...opnameItems,
                                  [ing.id]: {
                                    ...itemVal,
                                    physicalStock: e.target.value
                                  }
                                });
                              }}
                              className="w-24 px-2 py-1 rounded-lg border border-slate-300 font-black text-xs"
                            />
                          </td>
                          <td className="p-3 font-bold font-mono">
                            <span className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                              {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="Alasan (tumpah, waste, dll)..."
                              value={itemVal.reason}
                              onChange={(e) => {
                                setOpnameItems({
                                  ...opnameItems,
                                  [ing.id]: {
                                    ...itemVal,
                                    reason: e.target.value
                                  }
                                });
                              }}
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpnameModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingOpname}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  {submittingOpname ? 'Menyimpan...' : 'Simpan & Sesuaikan Stok Sistem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
