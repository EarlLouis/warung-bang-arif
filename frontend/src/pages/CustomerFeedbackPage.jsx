import React, { useState, useEffect } from 'react';
import { 
  MessageSquareText, Star, AlertCircle, CheckCircle, 
  ExternalLink, ArrowRight, UtensilsCrossed, Filter
} from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function CustomerFeedbackPage({ currentUser, onNavigateTab }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [ownerResponse, setOwnerResponse] = useState('');
  const [newStatus, setNewStatus] = useState('DITINJAU');

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const url = categoryFilter ? `/crm/feedbacks?category=${categoryFilter}` : '/crm/feedbacks';
      const data = await fetchApi(url);
      setFeedbacks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [categoryFilter]);

  const handleOpenResponse = (fb) => {
    setActiveFeedback(fb);
    setOwnerResponse(fb.owner_response || '');
    setNewStatus(fb.status || 'DITINJAU');
  };

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    try {
      await fetchApi(`/crm/feedbacks/${activeFeedback.id}/response`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          ownerResponse,
          userId: currentUser?.id || 1
        })
      });

      alert('Tanggapan dan status feedback berhasil disimpan!');
      setActiveFeedback(null);
      loadFeedbacks();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider">
            <MessageSquareText className="w-3.5 h-3.5" />
            <span>CRM & Feedback Pelanggan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Ulasan & Tindak Lanjut Komplain Rasa
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
            Menjawab kendala komplain kemanisan: keluhan pelanggan tercatat, terlacak, dan terhubung langsung ke halaman Resep untuk penyempurnaan takaran SOP dapur.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('public-feedback')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-sm transition"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Lihat Form Publik QR Pelanggan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['', 'RASA', 'PELAYANAN', 'KEBERSIHAN', 'LAINNYA'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-gold-400 text-ink-900 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === '' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feedbacks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbacks.map((fb) => {
          const isRasa = fb.category === 'RASA';
          const isLowRating = fb.rating <= 3;

          return (
            <div
              key={fb.id}
              className={`bg-white rounded-3xl border p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                isRasa && isLowRating
                  ? 'border-red-300 ring-2 ring-red-400/20 bg-gradient-to-b from-red-50/40 to-transparent'
                  : 'border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                {/* Header item */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{fb.customer_name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(fb.created_at).toLocaleDateString('id-ID')} • {fb.phone}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      fb.category === 'RASA'
                        ? 'bg-red-100 text-red-700'
                        : fb.category === 'PELAYANAN'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {fb.category}
                  </span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= fb.rating ? 'text-blue-400 fill-blue-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-1.5">({fb.rating}/5)</span>
                </div>

                {/* Comment Text */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 italic">
                  "{fb.comment}"
                </p>

                {/* Direct link for Taste complaints to Recipe module */}
                {isRasa && (
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>Terhubung ke Evaluasi Resep Baku</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Keluhan rasa ini perlu diselaraskan dengan takaran bumbu marinasi/madu di halaman Resep.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('recipe')}
                      className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>Buka Halaman Resep & Revisi Takaran</span>
                    </button>
                  </div>
                )}

                {/* Owner Response if any */}
                {fb.owner_response && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="font-bold text-emerald-900">Respon Manajemen Bang Arif:</span>
                    <p className="text-slate-700 mt-0.5">{fb.owner_response}</p>
                  </div>
                )}
              </div>

              {/* Status & Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  fb.status === 'BARU'
                    ? 'bg-amber-100 text-amber-800'
                    : fb.status === 'REVISI_RESEP_SELESAI'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {fb.status}
                </span>

                <button
                  onClick={() => handleOpenResponse(fb)}
                  className="text-xs font-extrabold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>Beri Respon / Tanggapi</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Response Modal */}
      {activeFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Tanggapi Ulasan: {activeFeedback.customer_name}
              </h3>
              <button onClick={() => setActiveFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResponse} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 italic">
                "{activeFeedback.comment}"
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Status Penanganan
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="DITINJAU">Ditinjau oleh Owner</option>
                  <option value="REVISI_RESEP_SELESAI">Revisi Resep Dapur Selesai Dilakukan</option>
                  <option value="REVIEWED">Selesai / Terjawab</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Respon / Evaluasi Manajemen *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Tuliskan evaluasi atau permohonan maaf dan solusi perbaikan rasa..."
                  value={ownerResponse}
                  onChange={(e) => setOwnerResponse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveFeedback(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
                >
                  Simpan Respon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
