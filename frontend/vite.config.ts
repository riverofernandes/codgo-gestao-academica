import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// O front não conhece nenhuma chave: toda chamada vai para /api, que o Vite
// encaminha ao back-end. Nada de variáveis VITE_* com segredos.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
