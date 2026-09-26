import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createChatConnection } from '@/api/chat'
import { ensureTinodeSession, resetTinodeSession, tinodeSession } from './useTinodeSession'
import type { TinodeTopic } from 'tinode-sdk'

const { instances, subscribe, login } = vi.hoisted(() => ({
  instances: [] as any[], subscribe: vi.fn(), login: vi.fn(),
}))
vi.mock('@/api/chat', () => ({ createChatConnection: vi.fn() }))
vi.mock('tinode-sdk', () => ({
  Tinode: class {
    onDisconnect?: () => void
    me: Partial<TinodeTopic> = { subscribe }
    constructor() { instances.push(this) }
    connect = vi.fn(async () => {})
    getServerInfo = () => ({})
    disconnect = vi.fn()
    login = login
    getMeTopic = () => this.me
  },
}))
beforeEach(() => {
  vi.useFakeTimers()
  resetTinodeSession()
  instances.length = 0
  vi.clearAllMocks()
  vi.mocked(createChatConnection).mockResolvedValue({ endpoint: 'https://chat.test', apiKey: 'key', ticket: 'ticket', authenticationScheme: 'tago' } as any)
  subscribe.mockResolvedValue({})
  login.mockResolvedValue({})
})
afterEach(() => { resetTinodeSession(); vi.useRealTimers() })

it('shares one login and uses SDK counts for initial, message, read and deletion updates', async () => {
  const first = ensureTinodeSession()
  expect(ensureTinodeSession()).toBe(first)
  const client = await first
  expect(await ensureTinodeSession()).toBe(client)
  expect(tinodeSession.client.value).toBe(client)
  expect(createChatConnection).toHaveBeenCalledTimes(1)
  expect(login).toHaveBeenCalledWith('tago', 'dGlja2V0')
  const me = instances[0].me
  expect(subscribe).toHaveBeenCalledWith({what:'sub'})
  me.onMetaSub({name:'usrA', unread:3})
  me.onContactUpdate('msg', {name:'usrA', unread:4, seq:4, latestMessage:()=>({seq:4})})
  me.onContactUpdate('msg', {name:'usrA', unread:4, seq:4, latestMessage:()=>({seq:4})})
  expect(tinodeSession.unread.value.get('usrA')).toBe(4)
  me.onContactUpdate('read', {name:'usrA', unread:0})
  expect(tinodeSession.unread.value.get('usrA')).toBe(0)
  me.onContactUpdate('msg', undefined)
  me.onMetaSub({name:'usrB', unread:7})
  me.onContactUpdate('gone', {name:'usrB', unread:7})
  expect(tinodeSession.unread.value.has('usrB')).toBe(false)
})

it('reconnects with a new ticket and replaces old contacts, ignoring stale callbacks', async () => {
  await ensureTinodeSession()
  const old = instances[0]
  old.me.onMetaSub({name:'usrA', unread:8})
  old.onDisconnect()
  expect(tinodeSession.client.value).toBeNull()
  await vi.advanceTimersByTimeAsync(1000)
  expect(createChatConnection).toHaveBeenCalledTimes(2)
  expect(subscribe).toHaveBeenCalledTimes(2)
  expect(tinodeSession.unread.value.size).toBe(0)
  old.me.onMetaSub({name:'usrA', unread:8})
  instances[1].me.onMetaSub({name:'usrB', unread:2})
  expect([...tinodeSession.unread.value]).toEqual([['usrB',2]])
})
