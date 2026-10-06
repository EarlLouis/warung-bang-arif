import React, { useState } from 'react';
import { 
  Flame, Bell, Clock, ChevronDown, Check, UserCircle, 
  ShoppingBag, UtensilsCrossed, ChefHat, PackageCheck, 
  DollarSign, BarChart3, MessageSquareText, ShieldAlert
} from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  users,
  activeShift,
  onOpenShiftModal,
  notifications,
  unreadCount,
  onRefreshNotifications
}) {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 via-blue-500 to-amber-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner text-2xl">
            🍗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight">
                Ayam Goreng & Bakar Madu Bang Arif
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-bold tracking-wide uppercase">
                Batang, Jawa Tengah
              </span>
            </div>
            <p className="text-[11px] text-blue-100 hidden sm:block">
              Jl. Rimat Bakti No.8, Sijono Barat • Jam Operasional: 11.00 – 00.00 WIB (2 Shift)
            </p>
          </div>
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center gap-3">
          {/* Shift Status Button - Hanya tampil jika BUKAN Owner */}
          {userRoleUpper !== 'Owner' && (
            <button
              onClick={onOpenShiftModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                activeShift 
                  ? 'bg-emerald-500/90 text-white hover:bg-emerald-600' 
                  : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {activeShift ? `${activeShift.shift_name} (Aktif)` : 'Buka Shift Kasir'}
              </span>
              <span className="sm:hidden">{activeShift ? 'Shift ON' : 'Buka Shift'}</span>
            </button>
          )}

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl bg-white/15 hover:bg-white/25 transition text-white"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span>Pemberitahuan Sistem</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleReadAll}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
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
                          !n.is_read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              n.severity === 'DANGER'
                                ? 'bg-red-100 text-red-700'
                                : n.severity === 'WARNING'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-blue-100 text-blue-700'
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

          {/* Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-slate-800 hover:bg-blue-50 text-xs font-bold transition shadow-sm"
            >
              <UserCircle className="w-4 h-4 text-blue-600" />
              <div className="text-left hidden md:block leading-tight">
                <div>{currentUser?.name?.split(' ')[0] || 'User'}</div>
                <div className="text-[10px] font-normal text-slate-500 uppercase">{currentUser?.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 overflow-hidden z-50 p-2">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ganti Peran / Pengguna
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setShowRoleDropdown(false);
                      if (u.role?.toUpperCase() === 'KASIR' && activeTab === 'dashboard') {
                        setActiveTab('pos');
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-left transition ${
                      currentUser?.id === u.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{u.name}</div>
                      <div className="text-[10px] text-slate-500">Peran: {u.role}</div>
                    </div>
                    {currentUser?.id === u.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}

                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('public-feedback');
                      setShowRoleDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-left text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <span>📱</span>
                    <span>Tampilan Pelanggan (QR Meja)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none bg-white">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}