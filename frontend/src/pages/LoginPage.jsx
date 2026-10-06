import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Flame } from 'lucide-react';
import { fetchApi } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-page">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full bg-gold-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -right-40 w-[520px] h-[520px] rounded-full bg-gold-600/10 blur-3xl" />

      <div className="relative w-full max-w-[400px]">
        <div className="rounded-3xl p-px bg-gradient-to-b from-gold-300/40 via-gold-200/5 to-gold-400/20 shadow-2xl shadow-black/70">
          <div className="rounded-3xl bg-page/95 backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="px-9 pt-10 pb-7 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 flex items-center justify-center shadow-glow mb-5">
                <Flame className="w-7 h-7 text-ink-900" strokeWidth={2.4} />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-400 mb-2">Sistem Manajemen Warung</div>
              <h1 className="font-display text-[34px] leading-[1.05] font-bold text-slate-900">
                Ayam Goreng <span className="gold-text">&amp; Bakar Madu</span>
              </h1>
              <p className="font-display text-xl italic text-ink-300 mt-1">Bang Arif</p>
              <div className="hairline-gold mt-6" />
              <p className="text-xs text-slate-500 mt-5">Masuk untuk mengakses sistem manajemen</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-9 pb-9 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@ayambangarif.com"
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-900/[0.03] text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-300 bg-slate-900/[0.03] text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gold-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 hover:from-gold-200 hover:to-gold-400 disabled:opacity-60 text-ink-900 text-sm font-extrabold tracking-wide transition shadow-glow"
              >
                <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-[10.5px] text-ink-400 mt-6 tracking-wide">Batang, Jawa Tengah &middot; 11.00 – 00.00 WIB</p>
      </div>
    </div>
  );
}
