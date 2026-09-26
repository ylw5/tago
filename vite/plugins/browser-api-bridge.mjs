import WebSocket from 'ws'

async function readInput() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function main() {
  const request = await readInput()
  const targets = await (await fetch(`${request.cdpUrl}/json/list`, { signal: AbortSignal.timeout(5000) })).json()
  const target = targets.find(item => item.type === 'page' && item.url.startsWith(request.upstreamOrigin))
  if (!target) throw new Error('请先用调试浏览器打开 TAGO API 域名')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  try {
    const path = request.path.startsWith('/api/v0/channels') ? request.path.replace(/^\/api(?=\/)/, '') : request.path
    const url = request.upstreamOrigin.replace(/\/$/, '') + path
    const expression = `
      (async () => {
        const request = ${JSON.stringify({ url, method: request.method, headers: request.headers, body: request.body })}
        if (${JSON.stringify(request.path.startsWith('/api/v0/channels'))}) {
          const csrf = await (await fetch(${JSON.stringify(request.upstreamOrigin + '/api/v1/auth/csrf')}, { credentials: 'include' })).json()
          if (csrf.data?.headerName && csrf.data?.token) request.headers[csrf.data.headerName] = csrf.data.token
        }
        const body = request.body ? Uint8Array.from(atob(request.body), c => c.charCodeAt(0)) : undefined
        const response = await fetch(request.url, {
          method: request.method, credentials: 'include', headers: request.headers, body,
        })
        return { status: response.status, headers: Array.from(response.headers.entries()), body: await response.text() }
      })()
    `
    const result = await new Promise((resolve, reject) => {
      socket.on('message', data => {
        const message = JSON.parse(String(data))
        if (message.id !== 1) return
        if (message.error || message.result?.exceptionDetails) reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)))
        else resolve(message.result?.result?.value)
      })
      socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
    })
    if (!result || typeof result.status !== 'number') throw new Error('Chrome returned an empty API response')
    process.stdout.write(JSON.stringify(result))
  }
  finally { socket.close() }
}

main().catch(error => { process.stderr.write(String(error.message || error)); process.exitCode = 1 })
