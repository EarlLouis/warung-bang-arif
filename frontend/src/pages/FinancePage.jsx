import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, PieChart, 
  Calendar, Plus, CheckCircle, Clock, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { fetchApi, formatRupiah } from '../utils/api';

export default function FinancePage({ currentUser }) {
  const [plData, setPlData] = useState(null);
  const [period, setPeriod] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [menuHppList, setMenuHppList] = useState([]);
  const [shiftReconciliation, setShiftReconciliation] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Gas LPG & Arang');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pl, hpp, shifts, exps] = await Promise.all([
        fetchApi(`/finance/pl-summary?period=${period}`),
        fetchApi('/finance/hpp-per-menu'),
        fetchApi('/finance/shift-reconciliation'),
        fetchApi('/finance/expenses')
      ]);
      setPlData(pl);
      setMenuHppList(hpp);
      setShiftReconciliation(shifts);
      setExpenses(exps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmittingExpense(true);
    try {
      await fetchApi('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: expCategory,
          amount: parseFloat(expAmount),
          description: expDesc,
          userId: currentUser?.id || 1
        })
      });
      alert('Beban pengeluaran operasional berhasil dicatat!');
      setShowExpenseModal(false);
      setExpAmount('');
      setExpDesc('');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Keuangan & HPP</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Laporan Laba-Rugi (P&L) & Rekonsiliasi Kas Shift
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
            Kalkulasi otomatis HPP resep × harga bahan terbaru, margin keuntungan per menu, pengeluaran operasional, dan cash reconciliation 2 shift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 rounded-lg transition ${period === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg transition ${period === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg transition ${period === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Bulanan
            </button>
          </div>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Beban Operasional</span>
          </button>
        </div>
      </div>

      {/* P&L Financial Cards */}
      {plData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan Bersih</span>
            <div className="text-2xl font-black text-slate-900 mt-2">{formatRupiah(plData.revenue.net)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Gross: {formatRupiah(plData.revenue.gross)} (Fee: -{formatRupiah(plData.revenue.platformFees)})
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total HPP Bahan (BOM)</span>
            <div className="text-2xl font-black text-blue-700 mt-2">{formatRupiah(plData.cogs.totalHpp)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Laba Kotor: <strong className="text-emerald-700">{formatRupiah(plData.cogs.grossProfit)}</strong> ({plData.cogs.grossMarginPercent}%)
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Beban Operasional</span>
            <div className="text-2xl font-black text-red-600 mt-2">{formatRupiah(plData.expenses.total)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Gas LPG, arang, listrik, gaji, sewa
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-transparent">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Laba Bersih Riil (Net Profit)</span>
            <div className="text-2xl font-black text-emerald-800 mt-2">{formatRupiah(plData.netProfit)}</div>
            <div className="text-xs font-bold text-emerald-700 mt-1">
              Net Profit Margin: {plData.netMarginPercent}%
            </div>
          </div>
        </div>
      )}

      {/* Two Columns: HPP Per Menu Matrix & Operational Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HPP Per Menu Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-sm text-slate-800">Tabel Kalkulasi HPP & Margin Tiap Menu</h3>
            <p className="text-xs text-slate-500">
              Dihitung otomatis: Takaran Resep Baku × Harga Beli Bahan Baku Terakhir
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Menu</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Harga Jual</th>
                  <th className="p-3.5">HPP Bahan</th>
                  <th className="p-3.5">Laba Kotor</th>
                  <th className="p-3.5">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menuHppList.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-black text-slate-900">{m.name}</td>
                    <td className="p-3.5 text-slate-500">{m.category}</td>
                    <td className="p-3.5 font-bold text-slate-800">{formatRupiah(m.sell_price)}</td>
                    <td className="p-3.5 font-black text-blue-700">{formatRupiah(m.hpp)}</td>
                    <td className="p-3.5 font-bold text-emerald-700">{formatRupiah(m.gross_margin)}</td>
                    <td className="p-3.5 font-black text-slate-700">{m.margin_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Expenses List */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-sm text-slate-800">Catatan Beban Operasional</h3>
              <p className="text-xs text-slate-500">Pengeluaran kas non-bahan baku</p>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {expenses.map((exp) => (
                <div key={exp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-slate-900">{exp.description}</span>
                    <span className="font-black text-xs text-red-600">{formatRupiah(exp.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{exp.category}</span>
                    <span>{new Date(exp.expense_date).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              + Tambah Pengeluaran Baru
            </button>
          </div>
        </div>
      </div>

      {/* Shift Cash Reconciliation Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-sm text-slate-800">
              Rekonsiliasi Kas Per Shift (Shift 1 & Shift 2)
            </h3>
            <p className="text-xs text-slate-500">
              Memverifikasi modal awal kasir, penjualan tunai POS, dan mendeteksi selisih fisik laci kasir saat pergantian/penutupan shift jam 00.00 WIB.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Tanggal & Shift</th>
                <th className="p-3.5">Kasir Bertugas</th>
                <th className="p-3.5">Modal Kas Awal</th>
                <th className="p-3.5">Penjualan Cash</th>
                <th className="p-3.5">QRIS / Transfer</th>
                <th className="p-3.5">Total Kas Harapan</th>
                <th className="p-3.5">Fisik Laci Kasir</th>
                <th className="p-3.5">Selisih</th>
                <th className="p-3.5">Status Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shiftReconciliation.map((sr) => {
                const diff = parseFloat(sr.cash_difference || 0);
                return (
                  <tr key={sr.id} className="hover:bg-slate-50">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{sr.shift_name}</div>
                      <div className="text-[10px] text-slate-400">{new Date(sr.shift_date).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{sr.cashier_name}</td>
                    <td className="p-3.5 text-slate-600">{formatRupiah(sr.starting_cash)}</td>
                    <td className="p-3.5 font-bold text-slate-800">{formatRupiah(sr.recorded_cash_sales)}</td>
                    <td className="p-3.5 text-slate-500">
                      QRIS: {formatRupiah(sr.recorded_qris_sales)} | TF: {formatRupiah(sr.recorded_transfer_sales)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{formatRupiah(sr.expected_cash)}</td>
                    <td className="p-3.5 font-bold text-slate-900">{formatRupiah(sr.ending_cash)}</td>
                    <td className="p-3.5 font-black font-mono">
                      {sr.status === 'CLOSED' ? (
                        <span className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                          {diff === 0 ? 'Pas (Rp 0)' : `${diff > 0 ? '+' : ''}${formatRupiah(diff)}`}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Shift Berjalan</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        sr.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sr.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Catat Pengeluaran Operasional</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kategori Pengeluaran *
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="Gas LPG & Arang">Gas LPG & Arang Batok</option>
                  <option value="Listrik & Air">Listrik & Air Bersih</option>
                  <option value="Gaji Pegawai">Gaji / Insentif Pegawai</option>
                  <option value="Sewa & Kebersihan">Sewa Tempat & Retribusi Kebersihan</option>
                  <option value="Lain-lain">Lain-lain / Keperluan Dapur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 150000"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli 2 tabung gas melon 3kg dan 1 karung arang"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-200 disabled:opacity-50"
                >
                  {submittingExpense ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
