import { computed, shallowRef } from 'vue'
import type { Tinode, TinodeMessage, TinodeTopic } from 'tinode-sdk'
import * as TinodeModule from 'tinode-sdk'
import { livePreviewFromMessage, type LivePreview } from '@/api/adapters'
import { createChatConnection } from '@/api/chat'

type TinodeFactory = typeof TinodeModule.Tinode
// Node resolves this UMD package to { default: { Tinode } }; Vite may expose the named class.
const createTinode:TinodeFactory = TinodeModule.Tinode ?? (TinodeModule.default as unknown as { Tinode: typeof TinodeModule.Tinode }).Tinode

function encodeChatSecret(value:string) {
  const digits='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes=Array.from(value, character => character.charCodeAt(0))
  let output=''
  for(let index=0;index<bytes.length;index+=3){
    const a=bytes[index]!,b=bytes[index+1]??0,c=bytes[index+2]??0
    output+=digits[a>>2]
    output+=digits[(a&3)<<4|b>>4]
    output+=index+1<bytes.length?digits[(b&15)<<2|c>>6]:'='
    output+=index+2<bytes.length?digits[c&63]:'='
  }
  return output
}

async function waitForChatHandshake(instance:Tinode) {
  for(let attempt=0;attempt<100;attempt+=1){
    if(instance.getServerInfo())return
    await new Promise(resolve=>setTimeout(resolve,50))
  }
  throw new Error('聊天握手超时')
}

const client = shallowRef<Tinode|null>(null)
const unread = shallowRef<ReadonlyMap<string, number>>(new Map())
const previews = shallowRef<ReadonlyMap<string, LivePreview>>(new Map())
const error = shallowRef('')
let pending: Promise<Tinode>|null = null
let instance: Tinode|null = null
let generation = 0
let retry: ReturnType<typeof setTimeout>|undefined
let retryDelay = 1000
const openTopics = new Set<string>()
const previewPulls = new Map<string, Promise<void>>()

export const tinodeSession = {
  client: computed(() => client.value),
  unread: computed(() => unread.value),
  previews: computed(() => previews.value),
  error: computed(() => error.value),
}

export function claimConversationTopic(peer?: string | null) {
  if (peer) openTopics.add(peer)
}

export function releaseConversationTopic(peer?: string | null) {
  if (peer) openTopics.delete(peer)
}

export function noteTinodePreview(peer: string | null | undefined, message?: TinodeMessage) {
  if (!peer?.startsWith('usr')) return
  const preview = livePreviewFromMessage(message)
  if (!preview) return
  const current = previews.value.get(peer)
  if (current && current.seq >= preview.seq) return
  const next = new Map(previews.value)
  next.set(peer, preview)
  previews.value = next
}

export async function withChatTimeout<T>(task: Promise<T>, message = '聊天活动订阅超时'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>|undefined
  try {
    return await Promise.race([task, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), 10000)
    })])
  } finally { clearTimeout(timer) }
}

export function syncTinodeUnread(contact?: TinodeTopic, removed = false) {
  if (!contact) return
  const peer = contact.name || contact.topic
  if (!peer?.startsWith('usr')) return
  const deleted = removed || Boolean(contact.deleted)
  const count = typeof contact.unread === 'number' ? Math.max(0, contact.unread) : undefined
  if (deleted ? !unread.value.has(peer) : count === undefined || unread.value.get(peer) === count) return
  const next = new Map(unread.value)
  if (deleted) next.delete(peer)
  else next.set(peer, count!)
  unread.value = next
}

function topicPeer(contact?: TinodeTopic) {
  const peer = contact?.name || contact?.topic
  return peer?.startsWith('usr') ? peer : ''
}

function waitForLatest(contact: TinodeTopic, target: number) {
  const cached = contact.latestMessage()
  if ((cached?.seq || 0) >= target && target > 0) return Promise.resolve()
  if (contact.onData) return Promise.resolve()
  return new Promise<void>(resolve => {
    let settled = false
    const previousDone = contact.onAllMessagesReceived
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (contact.onData === onData) contact.onData = undefined
      if (contact.onAllMessagesReceived === onDone) contact.onAllMessagesReceived = previousDone
      resolve()
    }
    const onData = (message?: TinodeMessage) => {
      if ((message?.seq || contact.latestMessage()?.seq || 0) >= target) finish()
    }
    const onDone = (count: number) => {
      previousDone?.(count)
      finish()
    }
    const timer = setTimeout(finish, 3000)
    contact.onData = onData
    contact.onAllMessagesReceived = onDone
  })
}

async function pullPreview(contact: TinodeTopic, peer: string, epoch: number) {
  if (epoch !== generation || openTopics.has(peer) || contact._attached) return
  const target = contact.seq || 0
  try {
    await withChatTimeout(contact.subscribe(contact.startMetaQuery().withData(undefined, undefined, 1).build()), '最新消息订阅超时')
    if (epoch !== generation || openTopics.has(peer)) return
    await new Promise(resolve => setTimeout(resolve, 0))
    if ((contact.latestMessage()?.seq || 0) < target) await waitForLatest(contact, target)
    if (epoch === generation) noteTinodePreview(peer, contact.latestMessage())
  } catch { /* 下次新消息或回到列表时再拉。 */ }
  finally {
    if (epoch === generation && !openTopics.has(peer) && !contact.onData && contact._attached) await contact.leave(false).catch(() => {})
  }
}

function enqueuePull(contact: TinodeTopic, peer: string, epoch: number) {
  const existing = previewPulls.get(peer)
  if (existing) return existing
  const task = Promise.resolve().then(() => pullPreview(contact, peer, epoch)).finally(() => {
    if (previewPulls.get(peer) === task) previewPulls.delete(peer)
  })
  previewPulls.set(peer, task)
  return task
}

function refreshContactPreview(contact: TinodeTopic | undefined, epoch: number, attempt = 0) {
  const peer = topicPeer(contact)
  if (!contact || !peer || epoch !== generation || attempt > 1) return
  const target = contact.seq || 0
  const cached = contact.latestMessage()
  if (cached?.seq && target > 0 && cached.seq >= target) {
    noteTinodePreview(peer, cached)
    return
  }
  // 聊天页开着时由会话里的消息写入预览；只有列表自己的补拉还挂着时才继续等。
  if (openTopics.has(peer) || (contact._attached && !previewPulls.has(peer))) return
  void enqueuePull(contact, peer, epoch).then(() => {
    if (epoch !== generation) return
    const latest = contact.latestMessage()
    if ((latest?.seq || 0) >= (contact.seq || 0)) {
      if (latest) noteTinodePreview(peer, latest)
      return
    }
    if (!openTopics.has(peer) && !contact._attached) refreshContactPreview(contact, epoch, attempt + 1)
  })
}

export function resetTinodeSession() {
  generation++
  clearTimeout(retry)
  retry = undefined
  pending = null
  client.value = null
  unread.value = new Map()
  previews.value = new Map()
  previewPulls.clear()
  openTopics.clear()
  error.value = ''
  retryDelay = 1000
  if (instance) { instance.onDisconnect = undefined; instance.disconnect(); instance = null }
}

function scheduleReconnect() {
  if (retry) return
  retry = setTimeout(() => {
    retry = undefined
    void ensureTinodeSession().catch(() => {})
  }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, 30000)
}

export function ensureTinodeSession(): Promise<Tinode> {
  if (client.value) return Promise.resolve(client.value)
  if (pending) return pending
  clearTimeout(retry)
  retry = undefined
  const epoch = generation
  const task = (async () => {
    let active: Tinode|null = null
    try {
      const bootstrap = await createChatConnection()
      if (epoch !== generation) throw new Error('聊天登录已取消')
      const endpoint = new URL(bootstrap.endpoint)
      active = new createTinode({host:endpoint.host,secure:endpoint.protocol==='https:',apiKey:bootstrap.apiKey,appName:'TAGO H5',platform:'web',transport:'ws',persist:false})
      instance = active
      const current = active
      active.onDisconnect = () => {
        if (epoch !== generation || instance !== current) return
        current.onDisconnect = undefined
        current.disconnect()
        instance = null
        client.value = null
        error.value = '聊天连接已断开，正在重连'
        scheduleReconnect()
      }
      await withChatTimeout(active.connect(), '聊天连接超时')
      await waitForChatHandshake(active)
      await withChatTimeout(active.login(bootstrap.authenticationScheme, encodeChatSecret(bootstrap.ticket)), '聊天登录超时')
      if (epoch !== generation || instance !== active) throw new Error('聊天登录已取消')
      const me = active.getMeTopic()
      unread.value = new Map()
      me.onMetaSub = contact => { if (epoch === generation && instance === current) syncTinodeUnread(contact) }
      me.onContactUpdate = (what, contact) => {
        if (epoch !== generation || instance !== current) return
        syncTinodeUnread(contact, what === 'gone')
        if (what === 'msg') refreshContactPreview(contact, epoch)
      }
      await withChatTimeout(me.subscribe({what:'sub'}), '未读状态订阅超时')
      if (epoch !== generation || instance !== active) throw new Error('聊天登录已取消')
      client.value = active
      error.value = ''
      retryDelay = 1000
      return active
    } catch (cause) {
      if (active) { active.onDisconnect = undefined; active.disconnect(); if(instance === active) instance = null }
      if (epoch === generation) {
        client.value = null
        error.value = cause instanceof Error ? cause.message : '聊天连接失败'
        const status = (cause as {statusCode?:number})?.statusCode
        if(status !== 401 && status !== 403) scheduleReconnect()
      }
      throw cause
    }
  })()
  pending = task
  void task.finally(() => { if (pending === task) pending = null }).catch(() => {})
  return task
}
