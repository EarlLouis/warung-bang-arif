import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://warung-bang-arif.vercel.app',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://warung-bang-arif.vercel.app',
        ws: true
      }
    }
  }
});
