import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bangarif_theme';

function readInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) { /* localStorage tidak tersedia */ }
  // Default: gelap (tema asli aplikasi). Ubah ke matchMedia jika ingin ikut sistem.
  return 'dark';
}

function applyTheme(theme, animate) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 350);
  }
  root.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#faf7f0' : '#0a0908');
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    const current = document.documentElement.getAttribute('data-theme');
    return current === 'light' || current === 'dark' ? current : readInitialTheme();
  });

  useEffect(() => { applyTheme(theme, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { /* abaikan */ }
      return next;
    });
  }, []);

  // Sinkron antar tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        applyTheme(e.newValue, true);
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { theme, toggleTheme };
}
