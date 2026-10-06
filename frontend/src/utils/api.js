import io from 'socket.io-client';

const API_BASE = '/api';

// Use same-origin socket connection through Vite proxy with websocket transport only
export const socket = io(window.location.origin, {
  transports: ['websocket'],
  reconnection: true,
  autoConnect: true
});

export async function fetchApi(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('bangarif_token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      localStorage.removeItem('bangarif_token');
      localStorage.removeItem('bangarif_user');
      // Beri kesempatan komponen memproses error, lalu kembali ke halaman login.
      setTimeout(() => window.location.reload(), 0);
    }
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number || 0);
}
