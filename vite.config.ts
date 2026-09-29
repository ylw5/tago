import { fileURLToPath, URL } from "node:url"
import { defineConfig, loadEnv } from "vite"
import uni from "@dcloudio/vite-plugin-uni"
import { apiBrowserProxyPlugin } from './vite/plugins/api-browser-proxy'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET
  const browserProxyEnabled = env.VITE_API_BROWSER_PROXY === 'true'
  const proxySecure = env.VITE_API_PROXY_SECURE === 'true'
  const upstreamOrigin = proxyTarget ? new URL(proxyTarget).origin : ''
  const proxy = proxyTarget && !browserProxyEnabled
    ? {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: proxySecure,
        },
      }
    : undefined

  return {
    plugins: [
      ...(browserProxyEnabled && upstreamOrigin ? [
        apiBrowserProxyPlugin({
          cdpUrl: env.VITE_API_CDP_URL || 'http://127.0.0.1:9223',
          upstreamOrigin,
        }),
      ] : []),
      uni(),
    ],
    // 开发时 /api 由 Vite 转到 VITE_API_PROXY_TARGET。
    // VITE_API_BROWSER_PROXY=true 时才改走调试浏览器，留给本机 Node TLS 被代理打断的情况。
    // 生产构建直接访问 VITE_API_BASE_URL，不使用这段逻辑。
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      watch: { ignored: ['**/.chrome-cdp/**', '**/.workbuddy/**'] },
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
