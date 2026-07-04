import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoOptimizerApiMiddleware } from './server/api-middleware.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  const appPort = getAppPort(env.APP_URL, 5173)

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'seo-optimizer-api',
        configureServer(server) {
          server.middlewares.use(seoOptimizerApiMiddleware())
        },
        configurePreviewServer(server) {
          server.middlewares.use(seoOptimizerApiMiddleware())
        },
      },
    ],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      port: appPort,
      strictPort: true,
    },
    preview: {
      port: appPort,
      strictPort: true,
    },
  }
})

function parsePort(value, fallback) {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback
}

function getAppPort(appUrl, fallback) {
  if (!appUrl) return fallback

  try {
    return parsePort(new URL(appUrl).port, fallback)
  } catch {
    return fallback
  }
}
