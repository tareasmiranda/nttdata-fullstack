import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Permite llamar a "/api/..." sin preocuparte por CORS.
    // Aunque el backend ya tiene CORS habilitado, esto es más cómodo.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});