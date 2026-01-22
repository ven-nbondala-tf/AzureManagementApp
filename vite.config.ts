import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // State management and data fetching
          'state-vendor': ['zustand', '@tanstack/react-query'],
          // UI components
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'clsx'],
          // Charts
          'charts-vendor': ['recharts'],
          // Date utilities
          'date-vendor': ['date-fns'],
          // Azure SDK
          'azure-vendor': [
            '@azure/identity',
            '@azure/arm-resources',
            '@azure/arm-subscriptions',
            '@azure/arm-authorization',
          ],
          // Microsoft Graph
          'graph-vendor': ['@microsoft/microsoft-graph-client'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  server: {
    port: 5200,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'recharts',
      'date-fns',
    ],
  },
});
