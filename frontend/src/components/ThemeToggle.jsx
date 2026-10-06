import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useTheme from '../hooks/useTheme';

// Tombol ganti tema. Menampilkan ikon tujuan: bulan saat terang, matahari saat gelap.
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={!isDark}
      className={`relative p-2.5 rounded-full text-ink-300 hover:text-slate-900 hover:bg-slate-900/[0.06] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 ${className}`}
    >
      {isDark
        ? <Sun className="w-4 h-4" strokeWidth={1.9} />
        : <Moon className="w-4 h-4" strokeWidth={1.9} />}
    </button>
  );
}
