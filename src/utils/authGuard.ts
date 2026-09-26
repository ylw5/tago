import { ApiError } from '@/api/client'
import { ensureBackendSession } from '@/composables/useBackendSession'

const HOME = '/pages/discover/index'
const PUBLIC_PAGES = new Set([
  '/pages/auth/register',
  '/pages/auth/reset',
])
const ENTRY_PAGES = new Set([
  '/',
  '/pages/auth/welcome',
  '/pages/auth/login',
])

type Route = { path: string; fullPath: string }
type GuardResult = true | { path: string; query?: { redirect: string }; replace: true }

export function installAuthGuard(router: { beforeEach: (guard: (to: Route) => Promise<GuardResult>) => unknown }) {
  router.beforeEach(async (to) => {
    if (ENTRY_PAGES.has(to.path)) {
      try {
        await ensureBackendSession(true)
        return { path: HOME, replace: true }
      }
      catch (error) {
        if (!(error instanceof ApiError && error.statusCode === 401)) {
          uni.showToast({ title: '暂时无法确认登录状态，请稍后重试', icon: 'none' })
          return true
        }
        // 站点根路径以前会把未登录用户送到登录页，欢迎页和登录页本身仍可停留。
        if (to.path === '/') {
          return { path: '/pages/auth/login', query: { redirect: encodeURIComponent(to.fullPath) }, replace: true }
        }
        return true
      }
    }

    if (PUBLIC_PAGES.has(to.path)) return true

    try {
      // 本地持久化的会话可能已过期，以服务端 Cookie 会话为准。
      await ensureBackendSession(true)
      return true
    }
    catch (error) {
      if (!(error instanceof ApiError && error.statusCode === 401)) {
        uni.showToast({ title: '暂时无法确认登录状态，请稍后重试', icon: 'none' })
      }
      // uni-app 的 onLoad 会额外解码一次，保留目标页参数中的转义字符。
      return { path: '/pages/auth/login', query: { redirect: encodeURIComponent(to.fullPath) }, replace: true }
    }
  })
}
