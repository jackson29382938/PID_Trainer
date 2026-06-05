import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split the heavy 3D libraries into their own cacheable chunks so the
        // app shell (and the lazily-loaded scene) download independently.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
});
