import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { resetTinodeSession } from './useTinodeSession'
import { useTinodeConversation } from './useTinodeConversation'

const { subscribe, publish, disconnect, topic, cleanup } = vi.hoisted(() => ({
  subscribe: vi.fn(), publish: vi.fn(), disconnect: vi.fn(),
  topic: {leave:vi.fn(async()=>{}), messages:vi.fn(), noteRead:vi.fn(), msgReadCount:vi.fn(()=>0), getMeta:vi.fn(async()=>{}), onAllMessagesReceived:undefined as ((count:number)=>void)|undefined, onMetaSub:undefined as ((contact:unknown)=>void)|undefined},
  cleanup: [] as (()=>void)[],
}))
vi.mock('vue', async () => ({ ...await vi.importActual<typeof import('vue')>('vue'), onUnmounted: (callback:()=>void) => cleanup.push(callback) }))
vi.mock('@/api/chat', () => ({
  getChatDetail: vi.fn(async () => ({ id: 'chat' })),
  listEncounters: vi.fn(async () => ({ items: [] })),
  getEncounterDetail: vi.fn(),
  createConversationConnection: vi.fn(async () => ({ topicHandle: 'topic' })),
  createChatConnection: vi.fn(async () => ({ endpoint: 'https://chat.example.test', ticket: 'ticket' })),
}))
vi.mock('tinode-sdk', () => ({
  Tinode: class {
    connect = vi.fn(async () => {})
    disconnect = disconnect
    getServerInfo = () => ({})
    login = vi.fn(async () => {})
    getCurrentUserID = () => 'me'
    getMeTopic = () => ({ subscribe: vi.fn(async () => {} ) })
    getTopic = () => Object.assign(topic, {subscribe})
    createMessage = (_topic: string, content: string) => ({ content })
    publishMessage = publish
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  resetTinodeSession()
  vi.clearAllMocks()
  subscribe.mockResolvedValue({})
  publish.mockResolvedValue({ params: { seq: 1 }, ts: '2026-09-25T00:00:00Z' })
})
afterEach(() => { cleanup.splice(0).forEach(callback=>callback()); resetTinodeSession(); vi.clearAllTimers(); vi.useRealTimers() })

it.each(['reject', 'timeout'])('does not pretend to connect or send when subscription fails: %s', async mode => {
  if (mode === 'reject') subscribe.mockRejectedValueOnce(new Error('订阅失败'))
  else subscribe.mockImplementationOnce(() => new Promise(() => {}))
  const chat = useTinodeConversation()
  const loading = chat.load('chat')
  await vi.advanceTimersByTimeAsync(10000)
  await loading
  expect(chat.connected.value).toBe(false)
  expect(chat.error.value).toBe(mode === 'reject' ? '订阅失败' : '聊天活动订阅超时')
  expect(disconnect).not.toHaveBeenCalled()
  expect(await chat.send('你好')).toBe(false)
  expect(publish).not.toHaveBeenCalled()
  expect(chat.messages.value).toEqual([])
})

it('keeps rejected sends out of the message list', async () => {
  publish.mockRejectedValueOnce(new Error('发送失败'))
  const chat = useTinodeConversation()
  await chat.load('chat')
  expect(await chat.send('你好')).toBe(false)
  expect(chat.sendError.value).toBe('发送失败')
  expect(chat.messages.value).toEqual([])
})

it('adds only the server-acknowledged message, with no automatic reply', async () => {
  const chat = useTinodeConversation()
  await chat.load('chat')
  expect(await chat.send('你好')).toBe(true)
  expect(publish).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(1000)
  expect(chat.messages.value).toMatchObject([{ id: '1', mine: true, text: '你好' }])
})

it('restores server read receipts after history changes the SDK receipt state', async () => {
  topic.msgReadCount.mockReturnValue(0)
  const chat = useTinodeConversation()
  await chat.load('chat')
  await chat.send('你好')
  expect(chat.messages.value[0]?.read).toBe(false)

  topic.msgReadCount.mockReturnValue(1)
  topic.onMetaSub?.({ user: 'peer', read: 1 })
  expect(chat.messages.value[0]?.read).toBe(true)

  topic.msgReadCount.mockReturnValue(0)
  topic.getMeta.mockImplementationOnce(async()=>{
    topic.msgReadCount.mockReturnValue(1)
    topic.onMetaSub?.({user:'peer',read:1})
  })
  topic.onAllMessagesReceived?.(2)
  await Promise.resolve()
  expect(topic.getMeta).toHaveBeenCalledWith({what:'sub'})
  expect(chat.messages.value[0]?.read).toBe(true)
})
