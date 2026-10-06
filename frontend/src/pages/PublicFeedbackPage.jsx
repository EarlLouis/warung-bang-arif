import React, { useState } from 'react';
import { Star, CheckCircle, Heart, Send, Sparkles, MessageSquare, Flame } from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function PublicFeedbackPage({ onBackToDashboard }) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('RASA');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/crm/public/feedback', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          phone,
          rating,
          category,
          comment
        })
      });
      setSubmitted(true);
    } catch (err) {
      alert('Gagal mengirim ulasan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-blue-700 p-6 text-white text-center relative">
          <div className="w-12 h-12 bg-white/15 rounded-xl mx-auto flex items-center justify-center mb-3">
            <Flame className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold">Ayam Goreng & Bakar Madu Bang Arif</h2>
          <p className="text-xs text-blue-100 mt-1">
            Jl. Rimat Bakti No.8, Sijono Barat, Batang
          </p>
          <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-white/15 text-[10px] font-bold tracking-wider uppercase">
            Form Ulasan Pelanggan (QR Meja & Struk)
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Matur Nuwun Sanget!</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                Masukan berharga Anda telah kami terima dan akan segera ditindaklanjuti oleh Bang Arif & Tim Dapur untuk menjaga cita rasa terbaik.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setComment('');
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition"
              >
                Kirim Ulasan Lainnya
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 text-center">
                Bantu kami menjadi lebih baik! Berikan penilaian jujur mengenai rasa makanan, porsi bumbu madu, hingga kenyamanan layanan kami.
              </p>

              {/* Star Rating */}
              <div className="text-center py-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Tingkat Kepuasan Anda
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'text-blue-400 fill-blue-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-xs font-bold text-blue-800 mt-1">
                  {rating === 5 && '⭐️⭐️⭐️⭐️⭐️ Luar Biasa Lezat & Memuaskan!'}
                  {rating === 4 && '⭐️⭐️⭐️⭐️ Sangat Enak'}
                  {rating === 3 && '⭐️⭐️⭐️ Cukup / Ada Masukan Rasa'}
                  {rating === 2 && '⭐️⭐️ Kurang Pas di Lidah'}
                  {rating === 1 && '⭐️ Perlu Banyak Perbaikan'}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Fokus Aspek Ulasan / Komplain
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'RASA', label: '🥘 Cita Rasa & Bumbu Madu' },
                    { id: 'PELAYANAN', label: '💁 Kecepatan Layanan' },
                    { id: 'KEBERSIHAN', label: '✨ Kebersihan Tempat' },
                    { id: 'LAINNYA', label: '📝 Lain-lain' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${
                        category === cat.id
                          ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Anda *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mas Budi"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ulasan / Keluhan / Saran Anda *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Contoh: Ayam bakar madunya enak banget bumbu meresap, tapi kemarin agak sedikit kemanisan..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Mengirim...' : 'Kirim Ulasan Sekarang'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
