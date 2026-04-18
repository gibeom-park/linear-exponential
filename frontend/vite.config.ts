import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Linear Exponential',
        short_name: 'LinEx',
        description: 'Powerlifting program tool',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
      workbox: {
        // 앱 셸: cache-first / API: network-first / 카탈로그: SWR (infra_model.md §4)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/exercises') || url.pathname.startsWith('/api/blocks'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'catalog-cache' },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@/', replacement: `${path.resolve(__dirname, './src')}/` },
      {
        find: /^@linex\/shared\/(.+)$/,
        replacement: `${path.resolve(__dirname, '../shared/src')}/$1.ts`,
      },
      {
        find: /^@linex\/shared$/,
        replacement: path.resolve(__dirname, '../shared/src/index.ts'),
      },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
