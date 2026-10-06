import React, { useState } from 'react';

const MENU_VISUALS = {
  'MN-01': { emoji: '🍗🔥', gradient: 'from-amber-700 via-amber-800 to-amber-950', badge: 'Bakar Madu' },
  'MN-02': { emoji: '🍗✨', gradient: 'from-yellow-500 via-amber-600 to-amber-800', badge: 'Goreng Lengkuas' },
  'MN-03': { emoji: '🍱🍗', gradient: 'from-emerald-700 via-emerald-800 to-teal-900', badge: 'Paket Komplit' },
  'MN-04': { emoji: '🍱✨', gradient: 'from-teal-600 via-emerald-700 to-slate-800', badge: 'Paket Goreng' },
  'MN-05': { emoji: '🌶️🔥', gradient: 'from-red-600 via-red-700 to-rose-950', badge: 'Sambal Terasi' },
  'MN-06': { emoji: '🌶️💥', gradient: 'from-orange-600 via-red-600 to-red-800', badge: 'Sambal Korek' },
  'MN-07': { emoji: '🥢🍯', gradient: 'from-amber-800 via-stone-800 to-stone-950', badge: 'Bacem Bakar' },
  'MN-08': { emoji: '🍚✨', gradient: 'from-slate-300 via-slate-400 to-slate-600', badge: 'Nasi Pulen' },
  'MN-09': { emoji: '🥤🧊', gradient: 'from-amber-500 via-amber-700 to-amber-900', badge: 'Es Teh Jumbo' },
  'MN-10': { emoji: '🍊🧊', gradient: 'from-orange-400 via-orange-500 to-amber-600', badge: 'Es Jeruk' },
  'MN-11': { emoji: '🦆🔥', gradient: 'from-amber-800 via-orange-900 to-stone-950', badge: 'Bebek Bakar' },
  'MN-12': { emoji: '🦆✨', gradient: 'from-yellow-600 via-amber-700 to-stone-900', badge: 'Bebek Goreng' },
  'MN-13': { emoji: '🐟🔥', gradient: 'from-slate-700 via-slate-800 to-stone-900', badge: 'Lele Bakar' },
  'MN-14': { emoji: '🐟✨', gradient: 'from-amber-600 via-yellow-700 to-stone-900', badge: 'Lele Goreng' },
  'MN-15': { emoji: '🐠🔥', gradient: 'from-red-700 via-amber-800 to-stone-950', badge: 'Nila Bakar' },
  'MN-16': { emoji: '🐠✨', gradient: 'from-yellow-500 via-amber-600 to-stone-900', badge: 'Nila Goreng' },
  'MN-17': { emoji: '🍵🧊', gradient: 'from-emerald-700 via-teal-800 to-slate-900', badge: 'Es Teh Tawar' },
};

export default function FoodThumbnail({ code, name, category, imageUrl, className = "h-28 sm:h-32" }) {
  const [imageFailed, setImageFailed] = useState(false);
  
  // Ambil preset visual berdasarkan kode (Aman dari nilai 0 / null / undefined)
  const safeCode = code ? String(code).toUpperCase() : '';
  const visual = MENU_VISUALS[safeCode] || { 
    emoji: '🍗', 
    gradient: 'from-amber-600 to-amber-800', 
    badge: category || 'Menu' 
  };

  // Pengecekan keamanan ekstra: Jika URL mengandung kata "nila" tetapi namanya bukan Nila, anggap URL salah
  const isMismatchedUrl = imageUrl && typeof imageUrl === 'string' && 
    imageUrl.toLowerCase().includes('nila') && 
    name && !name.toLowerCase().includes('nila');

  // Cek apakah imageUrl valid (bukan null, bukan "0", bukan string kosong, dan tidak mismatch)
  const isValidImageUrl = imageUrl && imageUrl !== '0' && imageUrl !== 0 && !imageFailed && !isMismatchedUrl;

  if (isValidImageUrl) {
    return (
      <div className={`relative w-full overflow-hidden bg-ink-800 flex items-center justify-center ${className}`}>
        <img
          src={imageUrl}
          alt={name || 'Menu Warung'}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br ${visual.gradient} flex flex-col items-center justify-center p-3 select-none text-white ${className}`}>
      <div className="text-4xl sm:text-5xl transform hover:scale-110 transition duration-300 drop-shadow-md">
        {visual.emoji}
      </div>
      <span className="mt-1.5 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider text-amber-200">
        {visual.badge}
      </span>
    </div>
  );
}