import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon-64.png', 'images/brand/eirvan-icon-192.png', 'images/brand/eirvan-icon-512.png'],
        manifest: {
          id: '/',
          name: 'EIRVAN – Explore, Learn & Stay Informed',
          short_name: 'EIRVAN',
          description: 'Independent digital publication covering Technology, Business, Lifestyle, Education, and News with verified primary sources.',
          theme_color: '#1c1917',
          background_color: '#FAF9F6',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/images/brand/eirvan-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/images/brand/eirvan-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          // Critical: null navigateFallback ensures Service Worker never intercepts prerendered HTML pages
          navigateFallback: null,
          globPatterns: ['**/*.{js,css,ico,png,webp,avif,jpg,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/images\/.*\.(?:avif|webp|jpg|png)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'eirvan-local-images',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: false,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.')
      }
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      cssCodeSplit: true,
      sourcemap: false,
      modulePreload: {
        polyfill: false
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-core';
              }
            }
            if (id.includes('src/data/seedArticles.ts')) {
              return 'seed-data';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    server: {
      hmr: false,
      watch: null
    }
  };
});
