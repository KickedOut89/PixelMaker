import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = '/PixelMaker/';

export default defineConfig({
  base: BASE,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'] },
      manifest: {
        name: 'PixelMaker',
        short_name: 'PixelMaker',
        description: 'Pixel art and sprite animation editor for game sprites.',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        background_color: '#1b1b22',
        theme_color: '#1b1b22',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
