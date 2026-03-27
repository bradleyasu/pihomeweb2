import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PiHome',
        short_name: 'PiHome',
        description: 'PiHome Control Panel',
        theme_color: '#0a0a12',
        background_color: '#0a0a12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Only apply navigateFallback to true navigation requests for the SPA,
        // not to API calls or other ports. Deny API path prefixes so the SW
        // never serves cached index.html in place of a real API response.
        navigateFallbackDenylist: [/^\/settings/, /^\/airplay/, /^\/api/],
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
  },
})
