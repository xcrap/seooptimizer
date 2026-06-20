import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoOptimizerApiMiddleware } from './server/api-middleware.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

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
  }
})
