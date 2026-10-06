import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, User, Calendar, Tag } from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/auth/audit-logs');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-ink-800 text-white p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 text-[11px] font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Audit Log & Keamanan Sistem</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Jejak Aktivitas & Pencegahan Fraud
          </h2>
          <p className="text-ink-200 text-xs sm:text-sm">
            Mencatat setiap tindakan penting pengguna secara transparan: buka/tutup shift, transaksi POS, penyesuaian stok opname, revisi resep, hingga approval PO.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-300 text-ink-900 hover:bg-gold-200 font-bold text-xs shadow-sm transition"
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Waktu & Tanggal</th>
                <th className="p-3.5">Pengguna & Peran</th>
                <th className="p-3.5">Aksi / Event</th>
                <th className="p-3.5">Modul Sistem</th>
                <th className="p-3.5">Rincian Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="p-3.5">
                    <div className="font-black text-slate-900">{log.user_name || 'Sistem / Tamu'}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{log.user_role || '-'}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-700">{log.module}</td>
                  <td className="p-3.5 text-slate-800 font-medium leading-snug max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
