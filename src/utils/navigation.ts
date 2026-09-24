const STACK_KEY = 'tago:nav-stack'
const HOME = '/pages/discover/index'

const FALLBACK_BY_ROUTE: Record<string, string> = {
  'pages/tag/detail': '/pages/discover/index',
  'pages/tag/respond': '/pages/discover/index',
  'pages/tag/compose': '/pages/discover/index',
  'pages/tag/compare': '/pages/applications/index',
  'pages/tag/history': '/pages/account/index',
  'pages/chat/index': '/pages/meet/index',
  'pages/applications/index': '/pages/meet/index',
  'pages/account/index': '/pages/discover/index',
  'pages/account/profile': '/pages/account/index',
  'pages/account/avatar': '/pages/account/profile',
  'pages/wallet/index': '/pages/account/index',
  'pages/gift/timeline': '/pages/wallet/index',
  'pages/exposure/index': '/pages/account/index',
  'pages/service/index': '/pages/account/index',
  'pages/admin/index': '/pages/service/index',
  'pages/auth/login': '/pages/auth/welcome',
  'pages/auth/register': '/pages/auth/welcome',
  'pages/auth/reset': '/pages/auth/login',
}

let suppressTracking = false
let trackingInstalled = false

export function normalizeUrl(url: string) {
  const raw = url.trim()
  const hash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : raw
  const [pathPart, queryPart = ''] = hash.split('?')
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
  if (!queryPart) return path
  const params = [...new URLSearchParams(queryPart).entries()].sort(([a], [b]) => a.localeCompare(b))
  const query = new URLSearchParams(params).toString()
  return query ? `${path}?${query}` : path
}

export function fallbackFor(route: string | null | undefined) {
  if (!route) return HOME
  const path = normalizeUrl(route).slice(1).split('?')[0]
  return FALLBACK_BY_ROUTE[path] || HOME
}

export function resolveBack(input: { stack: string[]; current: string | null; pageCount: number; fallback: string }) {
  if (input.pageCount > 1) return { action: 'navigateBack' as const, stack: input.stack }
  const stack = input.stack.map(normalizeUrl)
  const current = input.current ? normalizeUrl(input.current) : null
  if (current && stack[stack.length - 1] === current) stack.pop()
  const previous = stack[stack.length - 1]
  if (previous) return { action: 'redirect' as const, url: previous, stack }
  const fallback = normalizeUrl(input.fallback)
  return { action: 'redirect' as const, url: fallback, stack: [fallback] }
}

function memory() {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  }
  catch {
    return null
  }
}

export function readNavStack() {
  const store = memory()
  if (!store) return []
  try {
    const parsed = JSON.parse(store.getItem(STACK_KEY) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').map(normalizeUrl) : []
  }
  catch {
    return []
  }
}

function writeNavStack(stack: string[]) {
  const store = memory()
  if (!store) return
  store.setItem(STACK_KEY, JSON.stringify(stack.slice(-30)))
}

function currentUrl() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as { route?: string; options?: Record<string, string | undefined> } | undefined
  if (page?.route) {
    const query = Object.entries(page.options || {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return normalizeUrl(`/${page.route}${query ? `?${query}` : ''}`)
  }
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash.startsWith('/pages/')) return normalizeUrl(hash)
  }
  return null
}

function pushUrl(url: string) {
  const next = normalizeUrl(url)
  const stack = readNavStack()
  if (stack[stack.length - 1] === next) return
  stack.push(next)
  writeNavStack(stack)
}

function popUrl() {
  const stack = readNavStack()
  if (stack.length > 1) stack.pop()
  writeNavStack(stack)
}

export function rememberCurrentPage() {
  const current = currentUrl()
  if (current) pushUrl(current)
}

export function installNavHistory() {
  if (trackingInstalled) return
  trackingInstalled = true
  uni.addInterceptor('navigateTo', {
    invoke(args) {
      if (!suppressTracking) {
        rememberCurrentPage()
        pushUrl(args.url)
      }
      return args
    },
  })
  uni.addInterceptor('redirectTo', {
    invoke(args) {
      if (!suppressTracking) {
        rememberCurrentPage()
        pushUrl(args.url)
      }
      return args
    },
  })
  uni.addInterceptor('reLaunch', {
    invoke(args) {
      if (!suppressTracking) writeNavStack([normalizeUrl(args.url)])
      return args
    },
  })
  uni.addInterceptor('navigateBack', { invoke(args) { if (!suppressTracking) popUrl(); return args } })
  setTimeout(rememberCurrentPage, 0)
}

export function goBack() {
  const decision = resolveBack({
    stack: readNavStack(),
    current: currentUrl(),
    pageCount: getCurrentPages().length,
    fallback: fallbackFor(currentUrl()),
  })
  if (decision.action === 'navigateBack') {
    uni.navigateBack()
    return
  }
  writeNavStack(decision.stack)
  suppressTracking = true
  uni.redirectTo({
    url: decision.url,
    fail: () => uni.reLaunch({ url: decision.url }),
    complete: () => { suppressTracking = false },
  })
}
