import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const isDesktopBuild = process.env.ELECTRON_BUILD === 'true';

export default defineConfig({
  base: isDesktopBuild ? './' : '/',
  plugins: [
    react(),
    ...(!isDesktopBuild ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'Perry Parrot — Interview Copilot',
        short_name: 'Perry Parrot',
        description: 'Local-AI interview practice and live meeting copilot.',
        theme_color: '#0d0f14',
        background_color: '#0d0f14',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [{ src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })] : [])
  ]
});
