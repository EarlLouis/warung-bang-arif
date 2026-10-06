import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Share2, CheckCircle } from 'lucide-react';
import { formatRupiah } from '../utils/api';

export default function ReceiptModal({ receiptData, onClose }) {
  if (!receiptData) return null;

  const { warung, order, items } = receiptData;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*STRUK DIGITAL WARUNG AYAM BANG ARIF*\n` +
      `No. Invoice: ${order.invoice_number}\n` +
      `Tanggal: ${new Date(order.created_at).toLocaleString('id-ID')}\n` +
      `Tipe: ${order.order_type} (${order.table_number || '-'})\n` +
      `--------------------------------\n` +
      items.map(i => `${i.qty}x ${i.menu_name} = ${formatRupiah(i.subtotal)} (${i.spicy_level}, ${i.sweetness_level})`).join('\n') +
      `\n--------------------------------\n` +
      `*Total: ${formatRupiah(order.total_amount)}*\n` +
      `Metode: ${order.payment_method}\n` +
      `Dibayar: ${formatRupiah(order.amount_paid)}\n` +
      `Kembalian: ${formatRupiah(order.change_amount)}\n\n` +
      `Beri kami ulasan di: http://localhost:3000?page=public-feedback&orderId=${order.id}\n` +
      `_Matur Nuwun Atas Kunjungan Anda!_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return createPortal(
    <div className="receipt-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="receipt-card relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Actions */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-800">Struk Pembayaran Berhasil</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body (Printable Area) */}
        <div className="receipt-scroll overflow-y-auto p-6 bg-white flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[320px] bg-blue-50/40 p-5 rounded-xl border border-dashed border-blue-200 text-slate-700 font-mono text-xs shadow-inner"
          >
            {/* Warung Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="text-2xl mb-1">🍗🔥</div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {warung?.name || 'Ayam Goreng & Bakar Madu Bang Arif'}
              </h2>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                {warung?.address || 'Jl. Rimat Bakti No.8, Sijono Barat, Batang'}
              </p>
              <p className="text-[10px] text-slate-500">Telp: {warung?.phone || '0812-3456-7890'}</p>
            </div>

            {/* Meta Order */}
            <div className="py-2.5 text-[11px] border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold text-slate-900">{order.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{order.cashier_name || 'Kasir Warung'}</span>
              </div>
              <div className="flex justify-between">
                <span>Layanan:</span>
                <span className="font-semibold uppercase">{order.order_type} ({order.table_number || '-'})</span>
              </div>
            </div>

            {/* Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-800 text-[11px]">
                    <span>{item.menu_name}</span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{item.qty} x {formatRupiah(item.unit_price)}</span>
                    <span className="italic">{item.spicy_level} | {item.sweetness_level}</span>
                  </div>
                  {item.notes && (
                    <div className="text-[9px] text-blue-700 italic">Catatan: {item.notes}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Calculation */}
            <div className="py-2.5 text-[11px] border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                <span>TOTAL AKHIR:</span>
                <span>{formatRupiah(order.total_amount)}</span>
              </div>
              <div className="flex justify-between pt-1 text-[10px]">
                <span>Bayar ({order.payment_method}):</span>
                <span>{formatRupiah(order.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Kembalian:</span>
                <span>{formatRupiah(order.change_amount)}</span>
              </div>
            </div>

            {/* QR Feedback Teaser & Footer */}
            <div className="pt-3 text-center text-[10px] space-y-1 text-slate-500">
              <p className="font-bold text-slate-700">Scan QR Meja / Kunjungi Web Untuk Beri Ulasan Rasa & Layanan Kami</p>
              <p className="text-[9px]">SOP Resep Bergaransi - Rasa Lezat Konsisten!</p>
              <p className="text-[9px] font-semibold text-slate-800">~ Matur Nuwun Atas Kunjungan Panjenengan ~</p>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="no-print p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-400 text-ink-900 font-semibold hover:bg-gold-300 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Kirim WhatsApp</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}