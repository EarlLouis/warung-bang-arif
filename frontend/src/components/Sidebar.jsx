import React from 'react';
import {
  ShoppingBag, UtensilsCrossed, ChefHat, PackageCheck,
  DollarSign, BarChart3, MessageSquareText, ShieldAlert, Truck,
  LogOut, Flame, MapPin
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['OWNER'] },
    { id: 'pos', label: 'POS Kasir', icon: ShoppingBag, roles: ['OWNER', 'KASIR'] },
    { id: 'kds', label: 'Dapur (KDS)', icon: ChefHat, roles: ['OWNER', 'KASIR'] },
    { id: 'recipe', label: 'Resep & SOP', icon: UtensilsCrossed, roles: ['OWNER'] },
    { id: 'inventory', label: 'Inventori Stok', icon: PackageCheck, roles: ['OWNER', 'KASIR'] },
    { id: 'finance', label: 'Keuangan & HPP', icon: DollarSign, roles: ['OWNER'] },
    { id: 'crm', label: 'CRM & Komplain', icon: MessageSquareText, roles: ['OWNER', 'KASIR'] },
    { id: 'purchase-order', label: 'Purchase Order', icon: Truck, roles: ['OWNER'] },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert, roles: ['OWNER'] },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(currentUser?.role || 'OWNER'));

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 z-40 bg-page border-r border-slate-900/[0.07]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 h-[72px]">
        <div className="w-8 h-8 rounded-lg bg-gold-300 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-ink-900" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold leading-none text-slate-900 truncate">Bang Arif</div>
          <span className="block mt-1 text-[11px] text-ink-400 truncate">Ayam Goreng &amp; Bakar Madu</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-none">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 ${
                isActive
                  ? 'text-slate-900 bg-slate-900/[0.06]'
                  : 'text-ink-300 hover:text-slate-900 hover:bg-slate-900/[0.04]'
              }`}
            >
              <Icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-gold-300' : 'text-ink-400 group-hover:text-ink-200'}`} strokeWidth={1.7} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pt-3 pb-4 border-t border-slate-900/[0.07] space-y-3">
        <button
          onClick={() => {
            if (window.confirm('Yakin ingin keluar?')) onLogout();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-ink-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-[17px] h-[17px] shrink-0" strokeWidth={1.7} />
          <span>Keluar</span>
        </button>
        <div className="px-3 flex items-start gap-2 text-[11px] text-ink-500 leading-snug">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
          <span>Jl. Rimat Bakti No.8, Sijono Barat<br />Buka 11.00 – 00.00 WIB</span>
        </div>
      </div>
    </aside>
  );
}
