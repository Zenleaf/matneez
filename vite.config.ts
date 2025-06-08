import { defineConfig, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: { mode: string }): UserConfig => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // jsxImportSource: 'react', // This is usually default with React 17+ and TS
        // If you have specific Babel plugins for React, ensure they are compatible or handled by tsconfig
        // babel: {
        //   plugins: [
        //     ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
        //   ],
        // },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,jsx,ts,tsx,css,html,ico,png,svg}'], // Added ts, tsx, jsx
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/pouchdb/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pouchdb-cdn',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Cogneez',
          short_name: 'Cogneez',
          description: 'A learning environment and note-taking app',
          theme_color: '#2B2B2B',
          background_color: '#2B2B2B',
          display: 'standalone',
          start_url: '.',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
    optimizeDeps: {
      exclude: ['pouchdb']
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      }
    },
    // If you plan to use Jest for testing, ensure Vite's test config is set up
    // test: {
    //   globals: true,
    //   environment: 'jsdom',
    //   setupFiles: './src/setupTests.ts', // if you move setupTests to .ts
    // },
  };
});
