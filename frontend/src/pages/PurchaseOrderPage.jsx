import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, CheckCircle, Clock, ShoppingCart, 
  ArrowRight, ShieldCheck, DollarSign, AlertCircle, FileText
} from 'lucide-react';
import { fetchApi, formatRupiah } from '../utils/api';

export default function PurchaseOrderPage({ currentUser, onNavigateTab }) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);

  // New PO Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([]);
  const [submittingPo, setSubmittingPo] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, sups, comps] = await Promise.all([
        fetchApi('/po'),
        fetchApi('/po/suppliers'),
        fetchApi('/po/price-comparison')
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups);
      setComparisons(comps);
      if (sups.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sups[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setPoItems([]);
    setPoNotes('');
    setShowCreateModal(true);
  };

  const handleAddItemToPo = (ingredient) => {
    if (poItems.some(i => i.ingredientId === ingredient.id)) return;
    setPoItems([
      ...poItems,
      {
        ingredientId: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        qty: 10,
        unitPrice: ingredient.last_buy_price || 1000
      }
    ]);
  };

  const handleUpdateItemQtyPrice = (index, field, val) => {
    const next = [...poItems];
    next[index][field] = parseFloat(val || 0);
    setPoItems(next);
  };

  const handleRemovePoItem = (index) => {
    const next = [...poItems];
    next.splice(index, 1);
    setPoItems(next);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Pilih minimal satu bahan baku untuk dipesan!');
      return;
    }
    setSubmittingPo(true);
    try {
      await fetchApi('/po', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          notes: poNotes,
          items: poItems,
          userId: currentUser?.id || 1
        })
      });
      alert('Purchase Order berhasil dibuat! Menunggu persetujuan Owner.');
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      alert('Gagal membuat PO: ' + err.message);
    } finally {
      setSubmittingPo(false);
    }
  };

  const handleApprovePo = async (poId) => {
    try {
      await fetchApi(`/po/${poId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: currentUser?.id || 1 })
      });
      alert('PO berhasil disetujui! Status berubah menjadi DIKIRIM KE SUPPLIER.');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReceivePo = async (poId) => {
    if (!window.confirm('Konfirmasi barang dari supplier telah tiba di warung? Stok bahan baku akan otomatis bertambah dan pengeluaran kas akan dicatat.')) {
      return;
    }
    try {
      await fetchApi(`/po/${poId}/receive`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: currentUser?.id || 1 })
      });
      alert('Barang berhasil diterima! Stok bahan baku telah bertambah dan biaya telah tercatat di halaman Keuangan.');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
            <Truck className="w-3.5 h-3.5" />
            <span>Purchase Order & Supplier</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pengadaan Bahan Baku & Komparasi Harga Supplier
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
            Bandingkan harga antar pemasok di Batang & Pekalongan, ajukan PO, persetujuan Owner, dan konfirmasi barang tiba langsung update stok & kas keuangan.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Purchase Order Baru</span>
        </button>
      </div>

      {/* Supplier Price Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">
            Matriks Perbandingan Harga Supplier (Cost Optimization)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Membantu Owner memilih supplier termurah dengan kualitas terbaik untuk menjaga HPP tetap optimal.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Bahan Baku</th>
                <th className="p-3.5">Harga Terbaik Saat Ini</th>
                <th className="p-3.5">Pemasok Rekomendasi</th>
                <th className="p-3.5">Daftar Penawaran Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisons.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-black text-slate-900">{c.name}</td>
                  <td className="p-3.5 font-bold text-emerald-700">
                    {formatRupiah(c.bestPrice)} / {c.unit}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800">
                    {c.bestSupplier}
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-2">
                      {c.suppliers.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px]">
                          <strong>{s.supplier_name}:</strong> {formatRupiah(s.price)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-sm text-slate-800">Daftar Purchase Order (PO) Bahan Baku</h3>
            <p className="text-xs text-slate-500">Histori dan status tracking pengadaan barang dapur</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">No. PO</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Tanggal Pesan</th>
                <th className="p-3.5">Item Pembelian</th>
                <th className="p-3.5">Total Biaya</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => {
                const isPending = po.status === 'PENDING_APPROVAL';
                const isApproved = po.status === 'APPROVED';
                const isReceived = po.status === 'RECEIVED';

                return (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-black text-slate-900">{po.po_number}</td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{po.supplier_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{po.supplier_phone}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(po.order_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        {po.items?.map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700">
                            • {it.qty} {it.unit} {it.ingredient_name} ({formatRupiah(it.subtotal)})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 font-black text-slate-900 text-sm">
                      {formatRupiah(po.total_cost)}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                        isReceived
                          ? 'bg-emerald-100 text-emerald-800'
                          : isApproved
                          ? 'bg-blue-100 text-blue-800'
                          : isPending
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {isPending && currentUser?.role === 'OWNER' && (
                        <button
                          onClick={() => handleApprovePo(po.id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-sm"
                        >
                          Setujui (Approve)
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleReceivePo(po.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                        >
                          Konfirmasi Barang Tiba
                        </button>
                      )}

                      {isReceived && (
                        <span className="text-[11px] text-slate-400 font-semibold italic">
                          Selesai ({new Date(po.received_date).toLocaleDateString('id-ID')})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg">Buat Purchase Order Bahan Baku</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilih Supplier Tujuan *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact_person} - {s.phone})</option>
                  ))}
                </select>
              </div>

              {/* Items in PO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Daftar Bahan Yang Dipesan:
                </label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {poItems.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      Belum ada bahan dipilih. Pilih bahan dari daftar di bawah.
                    </div>
                  ) : (
                    poItems.map((item, idx) => (
                      <div key={item.ingredientId} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-xs text-slate-800 flex-1">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQtyPrice(idx, 'qty', e.target.value)}
                            placeholder="Qty"
                            className="w-16 px-2 py-1 rounded border border-slate-300 text-xs font-bold text-right"
                          />
                          <span className="text-[11px] text-slate-500 w-10">{item.unit}</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemQtyPrice(idx, 'unitPrice', e.target.value)}
                            placeholder="Harga/satuan"
                            className="w-24 px-2 py-1 rounded border border-slate-300 text-xs font-bold text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePoItem(idx)}
                            className="text-red-500 text-xs font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add Ingredient Selector */}
                  <div className="pt-2">
                    <select
                      onChange={(e) => {
                        const id = parseInt(e.target.value, 10);
                        const found = comparisons.find(c => c.id === id);
                        if (found) handleAddItemToPo(found);
                        e.target.value = '';
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="">+ Tambah Bahan Ke PO</option>
                      {comparisons.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Pengiriman / PO
                </label>
                <input
                  type="text"
                  placeholder="Kebutuhan segera, jadwal antar pagi jam 08.00..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Total Calculation */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center text-sm">
                <span className="font-bold text-blue-900">Perkiraan Total Biaya PO:</span>
                <span className="font-black text-blue-900 text-base">
                  {formatRupiah(poItems.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0))}
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPo}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  {submittingPo ? 'Mengajukan...' : 'Ajukan Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
