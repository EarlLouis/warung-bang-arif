import React, { useState } from 'react';
import {
  Bell, Clock, ShoppingBag, UtensilsCrossed, ChefHat, PackageCheck,
  DollarSign, BarChart3, MessageSquareText, ShieldAlert,
  Flame
} from 'lucide-react';
import { fetchApi } from '../utils/api';
import ThemeToggle from './ThemeToggle';

const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan performa bisnis hari ini' },
  pos: { title: 'POS Kasir', subtitle: 'Buat pesanan & proses pembayaran' },
  kds: { title: 'Dapur (KDS)', subtitle: 'Antrean pesanan yang sedang diproses' },
  recipe: { title: 'Resep & SOP', subtitle: 'Standar resep dan kalkulasi HPP' },
  inventory: { title: 'Inventori Stok', subtitle: 'Pantau ketersediaan bahan baku' },
  finance: { title: 'Keuangan & HPP', subtitle: 'Laporan keuangan & rekonsiliasi shift' },
  crm: { title: 'CRM & Komplain', subtitle: 'Ulasan dan keluhan pelanggan' },
  'purchase-order': { title: 'Purchase Order', subtitle: 'Pengadaan bahan baku dari supplier' },
  delivery: { title: 'Integrasi Delivery', subtitle: 'GoFood, GrabFood & ShopeeFood' },
  audit: { title: 'Audit Log', subtitle: 'Riwayat aktivitas sistem' },
};

export default function Topbar({
  activeTab,
  setActiveTab,
  currentUser,
  activeShift,
  onOpenShiftModal,
  notifications = [],
  unreadCount = 0,
  onRefreshNotifications
}) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const handleMarkAsRead = async (notifId) => {
    try {
      await fetchApi(`/notifications/${notifId}/read`, { method: 'PATCH' });
      onRefreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadAll = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'POST' });
      onRefreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['OWNER'] },
    { id: 'pos', label: 'POS Kasir', icon: ShoppingBag, roles: ['OWNER', 'KASIR'] },
    { id: 'kds', label: 'Dapur (KDS)', icon: ChefHat, roles: ['OWNER', 'KASIR'] },
    { id: 'recipe', label: 'Resep & SOP', icon: UtensilsCrossed, roles: ['OWNER'] },
    { id: 'inventory', label: 'Inventori Stok', icon: PackageCheck, roles: ['OWNER', 'KASIR'] },
    { id: 'finance', label: 'Keuangan & HPP', icon: DollarSign, roles: ['OWNER'] },
    { id: 'crm', label: 'CRM & Komplain', icon: MessageSquareText, roles: ['OWNER', 'KASIR'] },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert, roles: ['OWNER'] },
  ];

  const userRoleUpper = currentUser?.role?.toUpperCase() || 'OWNER';
  const visibleNav = navItems.filter(item => item.roles.includes(userRoleUpper));
  const meta = PAGE_META[activeTab] || { title: userRoleUpper === 'OWNER' ? 'Panel Manajemen' : 'Panel Operasional', subtitle: '' };

  // Inisial untuk avatar (misal: "Bang Arif" -> "B")
  const initialLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 bg-page/90 backdrop-blur border-b border-slate-900/[0.07]">
      {/* Top Bar */}
      <div className="px-4 sm:px-8 h-[72px] flex items-center justify-between">
        {/* Mobile-only brand */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-200 to-gold-500 flex items-center justify-center">
            <Flame className="w-4 h-4 text-ink-900" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm text-slate-800">Bang Arif</span>
        </div>

        <div className="hidden md:block leading-tight">
          <div className="font-display text-[26px] font-semibold text-slate-900 leading-none">{meta.title}</div>
          {meta.subtitle && <div className="text-xs text-ink-400 mt-1.5">{meta.subtitle}</div>}
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center gap-2.5">
          {/* Shift Status Button - Hanya tampil jika BUKAN Owner */}
          {userRoleUpper !== 'OWNER' && (
            <button
              onClick={onOpenShiftModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                activeShift
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {activeShift ? `${activeShift.shift_name} (Aktif)` : 'Buka Shift Kasir'}
              </span>
              <span className="sm:hidden">{activeShift ? 'Shift ON' : 'Buka Shift'}</span>
            </button>
          )}

          {/* Ganti tema gelap/terang */}
          <ThemeToggle />

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2.5 rounded-full text-ink-300 hover:text-slate-900 hover:bg-slate-900/[0.06] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-page">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-pop text-slate-800 shadow-2xl shadow-black/30 border border-slate-900/[0.1] overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Bell className="w-4 h-4 text-brand-600" />
                    <span>Pemberitahuan Sistem</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleReadAll}
                      className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold"
                    >
                      Tandai Semua Dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Tidak ada notifikasi saat ini
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-3.5 transition cursor-pointer hover:bg-slate-50 ${
                          !n.is_read ? 'bg-brand-50/60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              n.severity === 'DANGER'
                                ? 'bg-red-100 text-red-700'
                                : n.severity === 'WARNING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-brand-100 text-brand-700'
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">{n.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Badge (Single User Display) */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-gold-300 text-ink-900 font-semibold text-xs flex items-center justify-center">
              {initialLetter}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <div className="text-[13px] font-medium text-slate-800">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-[11px] text-ink-400 capitalize">
                {(currentUser?.role || 'User').toLowerCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-2 scrollbar-none bg-transparent border-t border-slate-100 md:hidden">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gold-400 text-ink-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-ink-900' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
