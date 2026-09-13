import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

function deepseekStatusPlugin(configured: boolean) {
  return {
    name: 'hospitalai-deepseek-status',
    configureServer(server: { middlewares: { use: (path: string, handler: (request: { method?: string }, response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }) => void) => void } }) {
      server.middlewares.use('/api/dev/deepseek/status', (request, response) => {
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end()
          return
        }
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ configured }))
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const workspaceRoot = resolve(__dirname, '..', '..')
  const env = { ...loadEnv(mode, workspaceRoot, ''), ...loadEnv(mode, process.cwd(), '') }
  return {
    plugins: [vue(), deepseekStatusPlugin(Boolean(env.DEEPSEEK_API_KEY))],
    server: {
      port: 5173,
      proxy: {
        '/api/dev/deepseek': {
          target: env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: () => '/chat/completions',
          headers: env.DEEPSEEK_API_KEY ? { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` } : {}
        },
        '/api': {
          target: env.VITE_CORE_API_BASE || 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts']
    }
  }
})
