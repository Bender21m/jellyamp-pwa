import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg'],
      manifest: {
        name: 'JellyAmp',
        short_name: 'JellyAmp',
        description: 'A beautiful Jellyfin music client with 200,000+ live recordings from Internet Archive',
        start_url: '/',
        scope: '/',
        theme_color: '#050508',
        background_color: '#050508',
        display: 'standalone',
        orientation: 'any',
        categories: ['music', 'entertainment'],
        icons: [
          {
            src: 'favicon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Library',
            short_name: 'Library',
            url: '/library',
            icons: [{ src: 'favicon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Live Archive',
            short_name: 'Archive',
            url: '/archive',
            icons: [{ src: 'favicon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Search',
            short_name: 'Search',
            url: '/search',
            icons: [{ src: 'favicon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /archive\.org/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/Items\/.*\/Images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jellyfin-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /archive\.org\/services\/img\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'archive-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation-vendor': ['framer-motion'],
          'jellyfin-vendor': ['@jellyfin/sdk'],
          'utils-vendor': ['zustand', '@tanstack/react-virtual'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
