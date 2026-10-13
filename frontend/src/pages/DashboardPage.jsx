import React, { useState, useEffect } from 'react';
import { 
  Download, ArrowUpRight, Calendar, RefreshCw
} from 'lucide-react';
import { fetchApi, formatRupiah } from '../utils/api';

export default function DashboardPage({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  const RANGES = [
    { id: '7d', label: '7 Hari', long: '7 hari terakhir' },
    { id: '30d', label: '1 Bulan', long: '30 hari terakhir' },
    { id: '1y', label: '1 Tahun', long: '1 tahun terakhir' },
    { id: 'all', label: 'Semua', long: 'sepanjang waktu jualan' },
  ];
  const rangeLong = RANGES.find(r => r.id === range).long;

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/analytics/dashboard?range=${range}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const handleExportCSV = () => {
    const token = localStorage.getItem('bangarif_token');
    window.open(`/api/analytics/export/csv?token=${encodeURIComponent(token || '')}`, '_blank');
  };
  const handleExportPDF = () => {
    const token = localStorage.getItem('bangarif_token');
    const url = `/api/analytics/export/pdf?token=${encodeURIComponent(token || '')}`;
    window.open(url, '_blank');
  };

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-7 h-7 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Memuat data analitik warung...</p>
        </div>
      </div>
    );
  }

  // Calculate max peak hour orders for bar chart scaling
  const maxOrders = Math.max(...data.peakHours.map(h => h.orderCount), 1);

  const peak = data.peakHours.find(h => h.orderCount > 0 && h.orderCount === maxOrders);
  const avgTicket = data.todayOrders > 0 ? Math.round(data.todayOmzet / data.todayOrders) : 0;
  const panel = 'rounded-xl border border-slate-900/[0.08] bg-panel';
  const link = 'inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200 transition-colors';

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-400">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Kasir POS aktif</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Layar dapur terhubung</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-3 py-2 text-xs text-ink-200">
            <Calendar className="w-4 h-4 text-ink-400" />
            Hari ini, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={loadData} title="Muat ulang data" aria-label="Muat ulang data"
            className="p-2 rounded-lg text-ink-300 hover:text-slate-900 hover:bg-slate-900/[0.06] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-900/10 text-xs font-medium text-ink-100 hover:bg-slate-900/[0.05] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400">
            <Download className="w-3.5 h-3.5" /> Excel/CSV
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold-300 text-ink-900 text-xs font-semibold hover:bg-gold-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Ringkasan: satu panel, empat kolom */}
      <section className={`${panel} grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 sm:divide-x divide-slate-900/[0.06] [&>*]:p-6`}>
        <div className="space-y-2">
          <p className="text-xs text-ink-400">Omzet hari ini</p>
          <p className="num text-[34px] leading-none text-slate-900">{formatRupiah(data.todayOmzet)}</p>
          <p className="text-xs text-ink-400">{data.todayOrders} transaksi · rata-rata {formatRupiah(avgTicket)}</p>
        </div>

        <div className="space-y-2 border-t border-slate-900/[0.06] sm:border-t-0">
          <p className="text-xs text-ink-400">Omzet bulan ini</p>
          <p className="num text-[34px] leading-none text-slate-900">{formatRupiah(data.monthOmzet)}</p>
          <p className="text-xs text-ink-400">{data.monthOrders} pesanan, semua kanal</p>
        </div>

        <button onClick={() => onNavigateTab('inventory')} className="group text-left space-y-2 border-t border-slate-900/[0.06] xl:border-t-0 hover:bg-slate-900/[0.02] transition-colors rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-400">
          <p className="text-xs text-ink-400">Stok menipis</p>
          <p className={`num text-[34px] leading-none ${data.lowStockCount > 0 ? 'text-red-500' : 'text-slate-900'}`}>
            {data.lowStockCount} <span className="text-base font-sans font-normal text-ink-400">bahan</span>
          </p>
          <p className={link}>{data.lowStockCount > 0 ? 'Restock di inventori' : 'Lihat inventori'} <ArrowUpRight className="w-3 h-3" /></p>
        </button>

        <button onClick={() => onNavigateTab('crm')} className="group text-left space-y-2 border-t border-slate-900/[0.06] xl:border-t-0 hover:bg-slate-900/[0.02] transition-colors rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-400">
          <p className="text-xs text-ink-400">Komplain belum ditinjau</p>
          <p className={`num text-[34px] leading-none ${data.unresolvedFeedbacks > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
            {data.unresolvedFeedbacks}
          </p>
          <p className={link}>{data.unresolvedFeedbacks > 0 ? 'Tanggapi di CRM' : 'Buka CRM'} <ArrowUpRight className="w-3 h-3" /></p>
        </button>
      </section>

      {/* Pilihan periode untuk Jam ramai + Menu terlaris */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-400">Periode grafik jam ramai &amp; menu terlaris</p>
        <div className="inline-flex rounded-lg border border-slate-900/[0.08] bg-panel p-1 gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r.id ? 'bg-gold-300 text-black' : 'text-ink-300 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jam ramai + menu terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className={`lg:col-span-2 ${panel} p-6`}>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-900">Jam ramai</h3>
              <p className="text-xs text-ink-400 mt-1">Jumlah pesanan per jam, {rangeLong} (11:00 – 00:00 WIB)</p>
            </div>
            {peak && <p className="text-xs text-ink-300">Puncak pukul <span className="text-gold-300 font-medium">{peak.hourLabel} WIB</span></p>}
          </div>

          <div className="mt-8 h-44 flex items-end gap-2 sm:gap-3 border-b border-slate-900/[0.08]">
            {data.peakHours.map((hour) => {
              const pct = Math.round((hour.orderCount / maxOrders) * 100);
              const isPeak = hour.orderCount > 0 && hour.orderCount === maxOrders;
              return (
                <div key={hour.hour} className="group relative flex-1 h-full flex items-end justify-center">
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 z-20 pointer-events-none transition-opacity bg-pop border border-slate-900/10 text-[11px] px-2.5 py-1.5 rounded-md whitespace-nowrap">
                    <div className="text-ink-300">{hour.hourLabel} WIB</div>
                    <div className="text-slate-900 font-medium">{hour.orderCount} pesanan · {formatRupiah(hour.totalOmzet)}</div>
                  </div>
                  <div
                    style={{ height: `${Math.max(pct, 3)}%` }}
                    className={`w-full max-w-[18px] rounded-t-sm transition-colors ${
                      isPeak ? 'bg-gold-300' : hour.orderCount > 0 ? 'bg-slate-900/25 group-hover:bg-slate-900/40' : 'bg-slate-900/[0.06]'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 sm:gap-3 mt-2">
            {data.peakHours.map((hour) => (
              <span key={hour.hour} className="flex-1 text-center text-[11px] text-ink-500 tabular-nums">{hour.hourLabel}</span>
            ))}
          </div>
        </section>

        <section className={`${panel} p-6 flex flex-col`}>
          <h3 className="font-display text-xl font-semibold text-slate-900">Menu terlaris</h3>
          <p className="text-xs text-ink-400 mt-1">Paling banyak dipesan, {rangeLong}</p>

          <ol className="mt-4 flex-1 divide-y divide-slate-900/[0.06]">
            {data.topMenus.length === 0 && (
              <li className="py-6 text-sm text-ink-400">Belum ada penjualan pada periode ini.</li>
            )}
            {data.topMenus.map((menu, idx) => (
              <li key={menu.id} className="flex items-center gap-4 py-3">
                <span className={`w-5 text-sm tabular-nums ${idx === 0 ? 'text-gold-300 font-semibold' : 'text-ink-500'}`}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-900 truncate">{menu.name}</p>
                  <p className="text-[11px] text-ink-400">{menu.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-slate-900 tabular-nums">{menu.total_qty_sold} porsi</p>
                  <p className="text-[11px] text-ink-400 tabular-nums">{formatRupiah(menu.total_revenue)}</p>
                </div>
              </li>
            ))}
          </ol>

          <button onClick={() => onNavigateTab('recipe')} className={`${link} mt-4 pt-4 border-t border-slate-900/[0.06]`}>
            Lihat resep &amp; HPP <ArrowUpRight className="w-3 h-3" />
          </button>
        </section>
      </div>

      {/* Kanal penjualan */}
      <section className={`${panel} p-6`}>
        <h3 className="font-display text-xl font-semibold text-slate-900">Kanal penjualan</h3>
        <p className="text-xs text-ink-400 mt-1">Dine-in dan delivery, setelah komisi platform</p>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 sm:divide-x divide-slate-900/[0.06] [&>*]:px-6 [&>*:first-child]:pl-0">
          {data.channelStats.map((c) => (
            <div key={c.order_type} className="space-y-1.5">
              <p className="text-xs text-ink-400">{c.order_type.replace(/_/g, ' ')} · {c.total_orders} pesanan</p>
              <p className="num text-2xl text-slate-900">{formatRupiah(c.net_amount)}</p>
              <p className="text-[11px] text-ink-500 tabular-nums">
                Kotor {formatRupiah(c.gross_amount)}
                {c.platform_fees > 0 && <span className="text-red-500"> · komisi −{formatRupiah(c.platform_fees)}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
