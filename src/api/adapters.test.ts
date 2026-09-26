import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { applyLivePreview, chatTimeLabel, livePreviewFromMessage, messagePreviewText } from './adapters'
import type { ConversationItem } from '@/types/models'

// 2026-09-24 是周四
const now = dayjs('2026-09-24T21:00:00')

describe('chatTimeLabel', () => {
  it('uses relative minutes and hours within the same day', () => {
    expect(chatTimeLabel('2026-09-24T20:59:40', now)).toBe('刚刚')
    expect(chatTimeLabel('2026-09-24T20:35:00', now)).toBe('25分钟前')
    expect(chatTimeLabel('2026-09-24T18:00:00', now)).toBe('3小时前')
  })

  it('shows the clock time for yesterday and earlier this week', () => {
    expect(chatTimeLabel('2026-09-23T20:14:00', now)).toBe('昨天 20:14')
    expect(chatTimeLabel('2026-09-22T22:08:00', now)).toBe('周二 22:08')
  })

  it('falls back to day counts before this week', () => {
    expect(chatTimeLabel('2026-09-19T10:00:00', now)).toBe('5天前')
    expect(chatTimeLabel('2026-09-01T10:00:00', now)).toBe('23天前')
  })
})

const conversation: ConversationItem = {
  id: 'c',
  peerTinodeUserId: 'usr1',
  user: { id: '1', name: '朴素的苹果', city: '', avatar: '' },
  tagTitle: '# 想找人一起认真读书',
  preview: '上一条',
  previewSeq: 4,
  timeLabel: '1小时前',
  lastActiveAt: '2026-09-24T18:00:00',
  unread: 1,
}

it('shows the newest message on the conversation list', () => {
  const updated = applyLivePreview(conversation, { text: '新的一条', sentAt: '2026-09-24T20:59:40', seq: 5 })
  expect(updated).toMatchObject({ preview: '新的一条', previewSeq: 5, lastActiveAt: '2026-09-24T20:59:40' })
  expect(applyLivePreview(updated, { text: '上一条', sentAt: '2026-09-24T18:00:00', seq: 4 }).preview).toBe('新的一条')
  expect(applyLivePreview(conversation, null)).toBe(conversation)
})

it('reads list preview text from plain and drafty messages', () => {
  expect(messagePreviewText('  你好 ')).toBe('你好')
  expect(messagePreviewText({ txt: ' 在吗 ' })).toBe('在吗')
  expect(messagePreviewText(null)).toBe('')
  expect(livePreviewFromMessage({ seq: 0, content: '空序号' })).toBeNull()
  expect(livePreviewFromMessage({ seq: 3, ts: '2026-09-24T20:00:00Z', content: { txt: '最新' } })).toMatchObject({ text: '最新', seq: 3 })
})

it('keeps the backend avatar choice instead of assigning a photo from the display name', async () => {
  const { identityToUser } = await import('./adapters')
  const user = identityToUser({ publicId: 'TG123', displayName: '会飞的西', avatarId: 'default-4', version: 1, updatedAt: '2026-09-25T00:00:00Z' }, 'fallback')
  expect(user).toMatchObject({ id: 'TG123', avatarId: 'default-4', name: '会飞的西' })
})
