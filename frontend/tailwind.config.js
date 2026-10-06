/** @type {import('tailwindcss').Config} */
// Tema "Noir Doré" (gelap) + "Ivoire Doré" (terang): aksen emas champagne.
// Skala warna default (slate, blue, emerald, red, amber) di-remap sehingga
// seluruh halaman otomatis mengikuti tema gelap tanpa mengubah tiap komponen.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aksen utama: emas champagne
        gold: {
          50: '#fbf6ea', 100: '#f3e8c8', 200: '#e8d3a0', 300: '#dcbc78',
          400: '#d0a55a', 500: '#c39240', 600: '#a97a30', 700: '#8a6226',
          800: '#6b4b1f', 900: '#4a3416',
        },
        // Semua skala di bawah membaca CSS variable (lihat index.css) sehingga
        // tema gelap/terang cukup ditukar lewat atribut data-theme pada <html>.
        brand: { 50: 'rgb(var(--c-brand-50) / <alpha-value>)', 100: 'rgb(var(--c-brand-100) / <alpha-value>)', 200: 'rgb(var(--c-brand-200) / <alpha-value>)', 300: 'rgb(var(--c-brand-300) / <alpha-value>)', 400: 'rgb(var(--c-brand-400) / <alpha-value>)', 500: 'rgb(var(--c-brand-500) / <alpha-value>)', 600: 'rgb(var(--c-brand-600) / <alpha-value>)', 700: 'rgb(var(--c-brand-700) / <alpha-value>)', 800: 'rgb(var(--c-brand-800) / <alpha-value>)', 900: 'rgb(var(--c-brand-900) / <alpha-value>)' },
        ink: { 50: 'rgb(var(--c-ink-50) / <alpha-value>)', 100: 'rgb(var(--c-ink-100) / <alpha-value>)', 200: 'rgb(var(--c-ink-200) / <alpha-value>)', 300: 'rgb(var(--c-ink-300) / <alpha-value>)', 400: 'rgb(var(--c-ink-400) / <alpha-value>)', 500: 'rgb(var(--c-ink-500) / <alpha-value>)', 600: 'rgb(var(--c-ink-600) / <alpha-value>)', 700: 'rgb(var(--c-ink-700) / <alpha-value>)', 800: 'rgb(var(--c-ink-800) / <alpha-value>)', 900: 'rgb(var(--c-ink-900) / <alpha-value>)' },
        slate: { 50: 'rgb(var(--c-slate-50) / <alpha-value>)', 100: 'rgb(var(--c-slate-100) / <alpha-value>)', 200: 'rgb(var(--c-slate-200) / <alpha-value>)', 300: 'rgb(var(--c-slate-300) / <alpha-value>)', 400: 'rgb(var(--c-slate-400) / <alpha-value>)', 500: 'rgb(var(--c-slate-500) / <alpha-value>)', 600: 'rgb(var(--c-slate-600) / <alpha-value>)', 700: 'rgb(var(--c-slate-700) / <alpha-value>)', 800: 'rgb(var(--c-slate-800) / <alpha-value>)', 900: 'rgb(var(--c-slate-900) / <alpha-value>)', 950: 'rgb(var(--c-slate-950) / <alpha-value>)' },
        blue: { 50: 'rgb(var(--c-blue-50) / <alpha-value>)', 100: 'rgb(var(--c-blue-100) / <alpha-value>)', 200: 'rgb(var(--c-blue-200) / <alpha-value>)', 300: 'rgb(var(--c-blue-300) / <alpha-value>)', 400: 'rgb(var(--c-blue-400) / <alpha-value>)', 500: 'rgb(var(--c-blue-500) / <alpha-value>)', 600: 'rgb(var(--c-blue-600) / <alpha-value>)', 700: 'rgb(var(--c-blue-700) / <alpha-value>)', 800: 'rgb(var(--c-blue-800) / <alpha-value>)', 900: 'rgb(var(--c-blue-900) / <alpha-value>)' },
        emerald: { 50: 'rgb(var(--c-emerald-50) / <alpha-value>)', 100: 'rgb(var(--c-emerald-100) / <alpha-value>)', 200: 'rgb(var(--c-emerald-200) / <alpha-value>)', 300: 'rgb(var(--c-emerald-300) / <alpha-value>)', 400: 'rgb(var(--c-emerald-400) / <alpha-value>)', 500: 'rgb(var(--c-emerald-500) / <alpha-value>)', 600: 'rgb(var(--c-emerald-600) / <alpha-value>)', 700: 'rgb(var(--c-emerald-700) / <alpha-value>)', 800: 'rgb(var(--c-emerald-800) / <alpha-value>)', 900: 'rgb(var(--c-emerald-900) / <alpha-value>)' },
        red: { 50: 'rgb(var(--c-red-50) / <alpha-value>)', 100: 'rgb(var(--c-red-100) / <alpha-value>)', 200: 'rgb(var(--c-red-200) / <alpha-value>)', 300: 'rgb(var(--c-red-300) / <alpha-value>)', 400: 'rgb(var(--c-red-400) / <alpha-value>)', 500: 'rgb(var(--c-red-500) / <alpha-value>)', 600: 'rgb(var(--c-red-600) / <alpha-value>)', 700: 'rgb(var(--c-red-700) / <alpha-value>)', 800: 'rgb(var(--c-red-800) / <alpha-value>)', 900: 'rgb(var(--c-red-900) / <alpha-value>)' },
        amber: { 50: 'rgb(var(--c-amber-50) / <alpha-value>)', 100: 'rgb(var(--c-amber-100) / <alpha-value>)', 200: 'rgb(var(--c-amber-200) / <alpha-value>)', 300: 'rgb(var(--c-amber-300) / <alpha-value>)', 400: 'rgb(var(--c-amber-400) / <alpha-value>)', 500: 'rgb(var(--c-amber-500) / <alpha-value>)', 600: 'rgb(var(--c-amber-600) / <alpha-value>)', 700: 'rgb(var(--c-amber-700) / <alpha-value>)', 800: 'rgb(var(--c-amber-800) / <alpha-value>)', 900: 'rgb(var(--c-amber-900) / <alpha-value>)', 950: 'rgb(var(--c-amber-950) / <alpha-value>)' },
        // Permukaan halaman
        page: 'rgb(var(--page-rgb) / <alpha-value>)',
        panel: 'rgb(var(--panel-rgb) / <alpha-value>)',
        pop: 'rgb(var(--pop-rgb) / <alpha-value>)',
        spicy: { 50: '#2a1412', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'system-ui', 'sans-serif'],
        display: ["'Cormorant Garamond'", "'Playfair Display'", 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px -12px rgba(0,0,0,0.6)',
        softer: '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 16px -6px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgba(208,165,90,0.25), 0 8px 28px -8px rgba(208,165,90,0.35)',
      },
    },
  },
  plugins: [],
}
