import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError, clearCsrf, request } from '@/api/client'
import { useUserStore } from '@/stores/user'
import { useAuthFlow } from './useAuthFlow'

vi.mock('@/api/client', async (original) => ({
  ...await original<typeof import('@/api/client')>(),
  request: vi.fn(),
  clearCsrf: vi.fn(),
}))

const agreement = { version: 'test-v2', body: '测试协议正文' }
const session = { authenticated: true, email: 'user@example.com', userId: 'user', expiresAt: null }
const challengeId = '4abbaee2-f482-4a36-b9a3-f8b34a0d43d9'
let registration = { authenticated: true, nextAction: 'NONE' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  setActivePinia(createPinia())
  registration = { authenticated: true, nextAction: 'NONE' }
  vi.mocked(request).mockImplementation(async ({ path }) => {
    if (path.endsWith('/registration-agreement')) return agreement
    if (path.endsWith('-codes')) return { challengeId, retryAfterSeconds: 60, expiresInSeconds: 300 }
    if (path.endsWith('/register')) return registration
    if (path.endsWith('/session')) return session
    if (path.endsWith('/password-reset')) return undefined
    throw new Error(`Unexpected request: ${path}`)
  })
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

async function ready(mode: 'register' | 'reset' = 'register') {
  const flow = useAuthFlow(mode)
  Object.assign(flow.form, { email: session.email, password: 'test-password', code: '123456' })
  await flow.requestCode()
  if (mode === 'register') await flow.loadAgreement()
  return flow
}

it('blocks submission without a loaded agreement or explicit acceptance, and supports retry', async () => {
  const flow = await ready()
  expect(await flow.verify()).toBe(false)
  flow.agreementAccepted.value = true
  vi.mocked(request).mockRejectedValueOnce(new Error('offline'))
  await flow.loadAgreement()
  expect(flow.agreement.value).toBeNull()
  expect(flow.agreementAccepted.value).toBe(false)
  expect(flow.error.value).toContain('加载失败')
  expect(await flow.verify()).toBe(false)
  expect(vi.mocked(request).mock.calls.some(([options]) => options.path.endsWith('/register'))).toBe(false)
  await flow.loadAgreement()
  expect(flow.agreement.value).toEqual(agreement)
  expect(flow.agreementAccepted.value).toBe(false)
})

it('submits the displayed agreement version and refreshes authenticated state after clearing CSRF', async () => {
  const flow = await ready()
  flow.agreementAccepted.value = true
  expect(await flow.verify()).toBe(true)
  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    path: '/v1/auth/register',
    body: { email: session.email, password: 'test-password', code: '123456', challengeId, agreementVersion: agreement.version, agreementAccepted: true },
  }))
  expect(clearCsrf).toHaveBeenCalledOnce()
  expect(useUserStore().session).toEqual(session)
  expect(flow.loginRequired.value).toBe(false)
})

it('reloads an outdated agreement and requires new acceptance', async () => {
  const flow = await ready()
  flow.agreementAccepted.value = true
  vi.mocked(request).mockRejectedValueOnce(new ApiError('accept current agreement', 'REGISTRATION_AGREEMENT_REQUIRED', 400))
  expect(await flow.verify()).toBe(false)
  expect(flow.agreement.value).toEqual(agreement)
  expect(flow.agreementAccepted.value).toBe(false)
  expect(flow.error.value).toContain('重新勾选')
})

it('treats an account created without a login session as registration success requiring login', async () => {
  const flow = await ready()
  flow.agreementAccepted.value = true
  useUserStore().setSession(session)
  registration = { authenticated: false, nextAction: 'LOGIN' }
  expect(await flow.verify()).toBe(true)
  expect(flow.loginRequired.value).toBe(true)
  expect(useUserStore().session).toBeNull()
  expect(clearCsrf).toHaveBeenCalledOnce()
  expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ path: '/v1/auth/session' }))
})

it('guides to login when session loading fails after the account has been created', async () => {
  const flow = await ready()
  flow.agreementAccepted.value = true
  vi.mocked(request).mockResolvedValueOnce(registration).mockRejectedValueOnce(new Error('offline'))
  expect(await flow.verify()).toBe(true)
  expect(flow.loginRequired.value).toBe(true)
})

it('keeps password reset independent of registration agreement fields', async () => {
  const flow = await ready('reset')
  expect(await flow.verify()).toBe(true)
  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    path: '/v1/auth/password-reset',
    body: { email: session.email, password: 'test-password', code: '123456', challengeId },
  }))
})
