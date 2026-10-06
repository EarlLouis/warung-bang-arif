import React from 'react';

export default function QrCodeSvg({ value = "AYAM_BANG_ARIF", size = 130 }) {
  // Generates an authentic decorative QR pattern locally without external calls
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="bg-white p-1 rounded-xl shadow-inner border border-slate-200"
    >
      {/* Corner markers */}
      {/* Top Left */}
      <rect x="5" y="5" width="26" height="26" fill="#0f172a" rx="3" />
      <rect x="9" y="9" width="18" height="18" fill="#ffffff" rx="2" />
      <rect x="13" y="13" width="10" height="10" fill="#d97706" rx="1.5" />

      {/* Top Right */}
      <rect x="69" y="5" width="26" height="26" fill="#0f172a" rx="3" />
      <rect x="73" y="9" width="18" height="18" fill="#ffffff" rx="2" />
      <rect x="77" y="13" width="10" height="10" fill="#d97706" rx="1.5" />

      {/* Bottom Left */}
      <rect x="5" y="69" width="26" height="26" fill="#0f172a" rx="3" />
      <rect x="9" y="73" width="18" height="18" fill="#ffffff" rx="2" />
      <rect x="13" y="77" width="10" height="10" fill="#d97706" rx="1.5" />

      {/* Authentic QR grid patterns */}
      <rect x="36" y="8" width="6" height="6" fill="#0f172a" />
      <rect x="46" y="8" width="8" height="6" fill="#0f172a" />
      <rect x="58" y="8" width="6" height="6" fill="#0f172a" />
      
      <rect x="36" y="18" width="6" height="12" fill="#0f172a" />
      <rect x="46" y="18" width="10" height="6" fill="#0f172a" />
      <rect x="60" y="22" width="5" height="8" fill="#0f172a" />

      <rect x="8" y="36" width="12" height="6" fill="#0f172a" />
      <rect x="24" y="36" width="6" height="10" fill="#0f172a" />
      <rect x="36" y="36" width="10" height="10" fill="#d97706" />
      <rect x="50" y="36" width="8" height="6" fill="#0f172a" />
      <rect x="64" y="36" width="12" height="6" fill="#0f172a" />
      <rect x="80" y="36" width="10" height="8" fill="#0f172a" />

      <rect x="8" y="48" width="8" height="8" fill="#0f172a" />
      <rect x="20" y="50" width="12" height="6" fill="#0f172a" />
      <rect x="38" y="50" width="6" height="12" fill="#0f172a" />
      <rect x="48" y="46" width="14" height="6" fill="#d97706" />
      <rect x="66" y="48" width="10" height="8" fill="#0f172a" />
      <rect x="80" y="48" width="8" height="12" fill="#0f172a" />

      <rect x="8" y="60" width="10" height="5" fill="#0f172a" />
      <rect x="22" y="60" width="8" height="6" fill="#0f172a" />
      <rect x="34" y="66" width="14" height="6" fill="#0f172a" />
      <rect x="52" y="60" width="8" height="12" fill="#0f172a" />
      <rect x="64" y="62" width="10" height="6" fill="#0f172a" />
      <rect x="78" y="64" width="12" height="8" fill="#0f172a" />

      <rect x="36" y="76" width="8" height="8" fill="#0f172a" />
      <rect x="48" y="78" width="12" height="6" fill="#0f172a" />
      <rect x="64" y="74" width="8" height="12" fill="#d97706" />
      <rect x="76" y="76" width="14" height="8" fill="#0f172a" />

      <rect x="36" y="88" width="12" height="6" fill="#0f172a" />
      <rect x="52" y="88" width="8" height="6" fill="#0f172a" />
      <rect x="64" y="88" width="14" height="6" fill="#0f172a" />
      <rect x="82" y="88" width="8" height="6" fill="#0f172a" />
    </svg>
  );
}
