import React, { useState } from 'react';
import { X, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatRupiah, fetchApi } from '../utils/api';

export default function ShiftModal({ activeShift, shifts, currentUser, onClose, onShiftUpdated }) {
  const [mode, setMode] = useState(activeShift ? 'close' : 'open');
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0]?.id || 1);
  const [startingCash, setStartingCash] = useState(200000);
  const [endingCash, setEndingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetchApi('/auth/shifts/open', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser.id,
          shiftId: selectedShiftId,
          startingCash: parseFloat(startingCash || 0),
          notes
        })
      });
      onShiftUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!endingCash && endingCash !== 0) {
      setError('Masukkan jumlah uang fisik di laci kasir saat ini!');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await fetchApi('/auth/shifts/close', {
        method: 'POST',
        body: JSON.stringify({
          userShiftId: activeShift.id,
          endingCash: parseFloat(endingCash),
          notes
        })
      });
      onShiftUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-500 text-white">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold text-lg">
              {activeShift ? 'Tutup Shift & Rekonsiliasi Kas' : 'Buka Shift Kasir Baru'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-blue-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeShift ? (
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Shift Berjalan:</span>
                  <span className="font-bold text-slate-800">{activeShift.shift_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Modal Kas Awal:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(activeShift.starting_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dibuka Pukul:</span>
                  <span>{new Date(activeShift.opened_at).toLocaleTimeString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hitungan Uang Fisik Kasir (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 1250000"
                  value={endingCash}
                  onChange={(e) => setEndingCash(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Sistem akan otomatis membandingkan dengan penjualan cash & mendeteksi selisih.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Tutup Shift
                </label>
                <textarea
                  rows="2"
                  placeholder="Keterangan tambahan jika ada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-md shadow-red-200 disabled:opacity-50"
                >
                  {loading ? 'Menutup...' : 'Tutup Shift Sekarang'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pilih Jadwal Shift *
                </label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} WIB)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Modal Kas Awal (Kembalian di Laci) *
                </label>
                <input
                  type="number"
                  required
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Buka Shift
                </label>
                <input
                  type="text"
                  placeholder="Kondisi laci kasir, serah terima, dll."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? 'Membuka...' : 'Buka Shift'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
