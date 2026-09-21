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
    // 本机代理会断开 Node TLS；开发模式经 Chrome 网络栈转发真实 API。
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
