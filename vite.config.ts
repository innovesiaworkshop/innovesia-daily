import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// Import the client theme(s) directly: the registry's getTheme() reads import.meta.env,
// which is undefined in this Node config context, so we select the theme here instead.
import { innovesiaTheme } from './src/config/clients/innovesia'

const clients = { innovesia: innovesiaTheme }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const t = clients[(env.VITE_CLIENT_ID as keyof typeof clients) ?? 'innovesia'] ?? innovesiaTheme

  return {
    plugins: [
      react(),
      VitePWA({
        // 'prompt' so a new SW waits and we can show a "reload" prompt instead of a silent reload.
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        // Precache the full shell (fonts + images) so installs aren't missing assets.
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        manifest: {
          name: t.appName,
          short_name: t.companyShortName,
          description: t.appTagline ?? t.appName,
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: t.pwa.backgroundColor,
          theme_color: t.pwa.themeColor,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
