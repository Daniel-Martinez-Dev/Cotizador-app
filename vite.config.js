import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://cotizadorccs-38398.web.app',
  'https://cotizadorccs-38398.firebaseapp.com',
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // La cámara queda habilitada solo para la propia app: es lo que usa el
  // lector de códigos de barras del inventario (ver utils/escanerCodigo.js).
  // Con `camera=()` el navegador bloquea getUserMedia y el escáner nunca abre.
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(self)',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://lh3.googleusercontent.com https://res.cloudinary.com",
    // mediastream: es el vídeo en vivo de la cámara del escáner de códigos.
    "media-src 'self' data: blob: mediastream:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' data: blob: https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://api.cloudinary.com",
    "frame-src https://accounts.google.com https://*.firebaseapp.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; '),
};

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'Cotizador Cold Chain',
        short_name: 'Cotizador',
        description: 'Cotizador Cold Chain Services',
        start_url: '.',
        display: 'standalone',
        theme_color: '#152E4D',
        background_color: '#FFFFFF',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    headers: SECURITY_HEADERS,
  },
  preview: {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    headers: SECURITY_HEADERS,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  test: {
    // Las pruebas de reglas necesitan el emulador de Firestore, así que no
    // corren con `npm test`: van aparte, en `npm run test:rules`.
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
  },
})
