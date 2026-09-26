import type { IncomingMessage, ServerResponse } from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

interface ApiBrowserProxyOptions {
  cdpUrl: string
  upstreamOrigin: string
}

interface BrowserFetchResult {
  status: number
  headers: Array<[string, string]>
  body: string
}

const bridgeScript = fileURLToPath(new URL('./browser-api-bridge.mjs', import.meta.url))
const ignoredRequestHeaders = new Set(['connection', 'content-length', 'cookie', 'host', 'origin', 'referer', 'accept-encoding'])
const ignoredResponseHeaders = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie'])

function readBody(request: IncomingMessage): Promise<string | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return Promise.resolve(undefined)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(Buffer.from(chunk)))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('base64')))
    request.on('error', reject)
  })
}

function runBridge(payload: object): Promise<BrowserFetchResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bridgeScript], { stdio: ['pipe', 'pipe', 'pipe'] })
    const output: Buffer[] = []
    const errors: Buffer[] = []
    const timer = setTimeout(() => child.kill(), 120_000)
    child.stdout.on('data', chunk => output.push(Buffer.from(chunk)))
    child.stderr.on('data', chunk => errors.push(Buffer.from(chunk)))
    child.on('error', reject)
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(Buffer.concat(errors).toString('utf8').trim() || `Browser bridge exited with ${code}`))
        return
      }
      try { resolve(JSON.parse(Buffer.concat(output).toString('utf8')) as BrowserFetchResult) }
      catch { reject(new Error('Browser bridge returned invalid JSON')) }
    })
    child.stdin.end(JSON.stringify(payload))
  })
}

export function apiBrowserProxyPlugin(options: ApiBrowserProxyOptions): Plugin {
  return {
    name: 'tago-api-browser-proxy',
    enforce: 'pre',
    configureServer(server) {
      const middleware = async (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void) => {
        if (!request.url?.startsWith('/api/')) return next()
        try {
          const headers: Record<string, string> = {}
          for (const [name, value] of Object.entries(request.headers)) {
            if (ignoredRequestHeaders.has(name.toLowerCase()) || name.toLowerCase().startsWith('sec-')) continue
            if (typeof value === 'string') headers[name] = value
            else if (Array.isArray(value)) headers[name] = value.join(', ')
          }
          const result = await runBridge({
            cdpUrl: options.cdpUrl,
            upstreamOrigin: options.upstreamOrigin,
            path: request.url,
            method: request.method || 'GET',
            headers,
            body: await readBody(request),
          })
          response.statusCode = result.status
          for (const [name, value] of result.headers) {
            if (!ignoredResponseHeaders.has(name.toLowerCase())) response.setHeader(name, value)
          }
          response.end(result.body)
        }
        catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause)
          console.error(`[tago-api-browser-proxy] ${message}`)
          response.statusCode = 502
          response.setHeader('content-type', 'application/json; charset=utf-8')
          response.end(JSON.stringify({ success: false, errCode: 'LOCAL_PROXY_ERROR', errMessage: message }))
        }
      }
      server.middlewares.stack.unshift({ route: '', handle: middleware })
    },
  }
}
