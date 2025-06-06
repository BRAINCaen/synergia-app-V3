import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: '.',
  base: '/',
  
  // Configuration des chemins
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/js/components',
      '@managers': '/src/js/managers',
      '@utils': '/src/js/utils',
      '@styles': '/src/styles'
    }
  },

  // Optimisations
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          // Séparer Firebase
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Managers principaux
          managers: [
            './src/js/managers/AuthManager.js',
            './src/js/managers/TeamManager.js',
            './src/js/managers/BadgingManager.js'
          ]
        }
      }
    },
    
    // Optimisation des chunks
    chunkSizeWarningLimit: 1000
  },

  // Configuration PWA
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'SYNERGIA v3.0',
        short_name: 'SYNERGIA',
        description: 'Plateforme collaborative de gestion d\'équipe',
        theme_color: '#6d28d9',
        background_color: '#0a0a0f',
        display: 'standalone',
        start_url: '/'
      }
    })
  ],

  // Configuration du serveur de dev
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: true
  }
})
