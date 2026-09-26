import type { components } from './types/generated'
import { FixtureMissingError, resolveFixture } from '@/mocks/fixtures'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions<TBody = unknown> {
  path: string
  method?: HttpMethod
  query?: Record<string, QueryValue>
  body?: TBody
  headers?: Record<string, string>
  timeout?: number
  silent?: boolean
  csrf?: boolean
  idempotent?: boolean
  idempotencyKey?: string
}

export interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  errCode?: string | null
  errMessage?: string | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type CsrfView = components['schemas']['CsrfView']

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
/** 静态演示数据开关：VITE_USE_FIXTURES=true 时全部接口改走 src/mocks/fixtures.ts，不发出任何网络请求 */
export const FIXTURES_ENABLED = import.meta.env.VITE_USE_FIXTURES === 'true'
const MUTATION_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'DELETE'])
let csrfCache: CsrfView | null = null

function createRequestId(prefix = 'request') {
  return `tago-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resolveUrl(path: string, query?: Record<string, QueryValue>) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  if (!query) return url

  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return queryString ? `${url}?${queryString}` : url
}

function normalizeError<T>(response: UniApp.RequestSuccessCallbackResult, requestId: string) {
  const envelope = response.data as ApiEnvelope<T> | undefined
  return new ApiError(
    envelope?.errMessage || `请求失败（${response.statusCode}）`,
    envelope?.errCode || `HTTP_${response.statusCode}`,
    response.statusCode,
    requestId,
    envelope?.data,
  )
}

function normalizeFixtureError<T>(envelope: ApiEnvelope<T> | undefined, statusCode: number, requestId: string) {
  return new ApiError(
    envelope?.errMessage || `请求失败（${statusCode}）`,
    envelope?.errCode || `HTTP_${statusCode}`,
    statusCode,
    requestId,
    envelope?.data,
  )
}

function getNetworkErrorMessage(cause: unknown) {
  const rawMessage = cause instanceof Error
    ? cause.message
    : cause && typeof cause === 'object' && 'errMsg' in cause
      ? String((cause as { errMsg?: unknown }).errMsg || '')
      : ''

  if (/SSL_PROTOCOL_ERROR|ssl protocol|certificate/i.test(rawMessage)) {
    return '服务端 HTTPS 配置异常，请联系管理员后重试'
  }
  if (/^request:fail/i.test(rawMessage)) {
    return '暂时无法连接 TAGO 服务，请稍后重试'
  }
  return rawMessage || '无法连接 TAGO 服务'
}

async function executeRequest<TResponse, TBody>(
  options: RequestOptions<TBody>,
  extraHeaders: Record<string, string> = {},
): Promise<TResponse> {
  const method = options.method ?? 'GET'
  const requestId = createRequestId(method.toLowerCase())
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...options.headers,
    ...extraHeaders,
  }

  if (options.idempotent || options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey || createRequestId('idempotency')
  }

  if (FIXTURES_ENABLED) {
    try {
      const fixture = await resolveFixture({ method, path: options.path, query: options.query, body: options.body })
      if (fixture.status < 200 || fixture.status >= 300) {
        const envelope = fixture.data as ApiEnvelope<TResponse> | undefined
        throw normalizeFixtureError<TResponse>(envelope, fixture.status, requestId)
      }
      if (fixture.status === 204 || fixture.data === undefined) return undefined as TResponse
      return fixture.data as TResponse
    }
    catch (cause) {
      if (cause instanceof FixtureMissingError) throw new ApiError(cause.message, 'FIXTURE_MISSING', 500, requestId)
      throw cause
    }
  }

  let response: UniApp.RequestSuccessCallbackResult
  try {
    response = await uni.request({
      url: resolveUrl(options.path, options.query),
      method,
      data: options.body as UniApp.RequestOptions['data'],
      header: headers,
      timeout: options.timeout ?? 60_000,
      withCredentials: true,
    })
  }
  catch (cause) {
    throw new ApiError(getNetworkErrorMessage(cause), 'NETWORK_ERROR', undefined, requestId)
  }

  const envelope = response.data as ApiEnvelope<TResponse> | undefined
  if (response.statusCode < 200 || response.statusCode >= 300 || envelope?.success === false) {
    throw normalizeError<TResponse>(response, requestId)
  }

  if (response.statusCode === 204) return undefined as TResponse
  return (envelope && 'data' in envelope ? envelope.data : response.data) as TResponse
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function clearCsrf() {
  csrfCache = null
}

export async function getCsrf(force = false) {
  if (!csrfCache || force) {
    csrfCache = await executeRequest<CsrfView, never>({
      path: '/v1/auth/csrf',
      method: 'GET',
      silent: true,
      csrf: false,
    })
  }
  return csrfCache
}

export async function request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
  const method = options.method ?? 'GET'
  const needsCsrf = options.csrf ?? MUTATION_METHODS.has(method)

  try {
    const csrf = needsCsrf ? await getCsrf() : null
    const headers = csrf ? { [csrf.headerName]: csrf.token } : undefined
    return await executeRequest<TResponse, TBody>(options, headers)
  }
  catch (error) {
    if (error instanceof ApiError && needsCsrf && error.code === 'CSRF_INVALID') {
      const csrf = await getCsrf(true)
      return executeRequest<TResponse, TBody>(options, { [csrf.headerName]: csrf.token })
    }

    if (!options.silent) {
      const message = error instanceof Error ? error.message : '网络开了个小差，请稍后再试'
      uni.showToast({ title: message, icon: 'none' })
    }
    throw error
  }
}
