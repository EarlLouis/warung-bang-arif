import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Clock, CheckSquare, Flame, CheckCircle, 
  AlertCircle, Sparkles, BookOpen, Utensils
} from 'lucide-react';
import { fetchApi, socket } from '../utils/api';

export default function KdsPage({ onNavigateTab }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/kds/orders');
      setOrders(data);
    } catch (err) {
      console.error('KDS load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // Socket events for real-time order arriving or status changed
    socket.on('order:created', () => {
      loadOrders();
    });

    socket.on('kds:order_updated', () => {
      loadOrders();
    });

    return () => {
      socket.off('order:created');
      socket.off('kds:order_updated');
    };
  }, []);

  const handleUpdateStatus = async (orderId, status, itemId = null, sopChecked = null) => {
    try {
      await fetchApi(`/kds/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, itemId, sopChecked })
      });
      loadOrders();
    } catch (err) {
      alert('Gagal update status dapur: ' + err.message);
    }
  };

  const handleToggleItemSop = async (orderId, itemId, currentVal) => {
    await handleUpdateStatus(orderId, 'MEMASAK', itemId, !currentVal);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* KDS Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-ink-800 text-white p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-gold-300 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Display System (KDS) & Digital SOP Dapur</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Layar Monitor Dapur Warung Bang Arif
          </h2>
          <p className="text-ink-200 text-xs sm:text-sm">
            Alur otomatis: Antrean Masuk → Validasi SOP & Marinasi 2 Jam → Memasak → Ceklist Standar Rasa → Siap Saji.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md text-center border border-white/10">
            <div className="text-2xl font-black text-blue-400">
              {orders.filter(o => o.status !== 'READY').length}
            </div>
            <div className="text-[10px] text-ink-200 uppercase font-bold">Pesanan Aktif</div>
          </div>
          <button
            onClick={() => onNavigateTab('recipe')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-ink-900 font-black text-xs transition shadow-md"
          >
            <BookOpen className="w-4 h-4" />
            <span>Katalog Resep Baku & SOP</span>
          </button>
        </div>
      </div>

      {/* Orders Columns / Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold">Sinkronisasi pesanan dapur...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Utensils className="w-12 h-12 stroke-1 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Dapur Sedang Tenang</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Semua pesanan telah selesai dimasak dan disajikan. Pesanan baru dari POS atau Delivery akan muncul seketika di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => {
            const isCooking = order.status === 'COOKING';
            const isReady = order.status === 'READY';
            const elapsed = order.elapsed_minutes || 0;

            return (
              <div
                key={order.id}
                className={`flex flex-col rounded-3xl border transition-all duration-200 overflow-hidden bg-white shadow-sm hover:shadow-md ${
                  isReady
                    ? 'border-emerald-300 ring-2 ring-emerald-400/20'
                    : isCooking
                    ? 'border-blue-400 ring-2 ring-blue-400/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Ticket Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${
                    isReady
                      ? 'bg-emerald-500 text-white'
                      : isCooking
                      ? 'bg-gradient-to-r from-blue-500 to-amber-500 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm">{order.invoice_number}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-black/20 text-white">
                        {order.order_type}
                      </span>
                    </div>
                    <div className="text-xs font-bold mt-0.5">
                      {order.table_number !== '-' ? `${order.table_number}` : order.customer_name}
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/25 text-white font-mono font-bold text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed} mnt lalu</span>
                  </div>
                </div>

                {/* Items List & Customization Details */}
                <div className="p-4 flex-1 space-y-3 divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-black text-xs">
                            {item.qty}x
                          </span>
                          <div>
                            <h4 className="font-black text-sm text-slate-900">{item.menu_name}</h4>
                          </div>
                        </div>

                        {/* Button to view SOP recipe */}
                        {item.recipe_id && (
                          <button
                            onClick={() => setSelectedRecipeDetail(item)}
                            className="text-[10px] text-blue-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <span>Lihat SOP</span>
                          </button>
                        )}
                      </div>

                      {item.notes && (
                        <div className="p-2 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                          <strong>Catatan Khusus:</strong> {item.notes}
                        </div>
                      )}

                      {/* 2 Jam Marination Notice */}
                      {item.marination_time_minutes > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span>❄️</span>
                          <span>Bahan telah melalui marinasi vakum chiller 2 jam (120 mnt).</span>
                        </div>
                      )}

                      {/* Kitchen SOP Checkbox before serving */}
                      <div className="pt-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200">
                          <input
                            type="checkbox"
                            checked={!!item.sop_checked}
                            onChange={() => handleToggleItemSop(order.id, item.id, item.sop_checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span>Standar SOP Dapur Terpenuhi (Rasa & Kematangan Pas)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Workflow Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                  {order.status === 'RECEIVED' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'MEMASAK')}
                      className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-slate-900 font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Mulai Memasak</span>
                    </button>
                  )}

                  {order.status === 'COOKING' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'SIAP_SAJI')}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Makanan Siap Saji (Kirim Notif Kasir)</span>
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <div className="w-full flex items-center gap-2">
                      <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                        ✓ Telah Disajikan
                      </div>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SELESAI')}
                        className="py-2 px-4 rounded-xl bg-ink-700 hover:bg-ink-600 text-white font-bold text-xs"
                      >
                        Arsipkan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Recipe Modal */}
      {selectedRecipeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  SOP Standar: {selectedRecipeDetail.menu_name}
                </h3>
                <span className="text-xs text-blue-700 font-bold">Instruksi Baku Dapur</span>
              </div>
              <button
                onClick={() => setSelectedRecipeDetail(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="font-bold text-blue-900">Profil Rasa Standar:</span>
                <p className="text-slate-700 mt-1">{selectedRecipeDetail.taste_profile || '-'}</p>
              </div>

              {selectedRecipeDetail.sop_notes && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="font-bold text-red-900">Peringatan SOP Kritis (Anti-Komplain):</span>
                  <p className="text-slate-700 mt-1">{selectedRecipeDetail.sop_notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Checklist Verifikasi:</h4>
                <div className="space-y-2">
                  {selectedRecipeDetail.sop_checklists?.map((chk) => (
                    <div key={chk.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">{chk.step_number}. {chk.title}</div>
                      <div className="text-slate-600 mt-0.5">{chk.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecipeDetail(null)}
                className="w-full py-2.5 rounded-xl bg-ink-800 text-white font-bold text-xs"
              >
                Tutup SOP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}