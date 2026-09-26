import dayjs from 'dayjs'
import type { components } from './types/generated'
import type { ApplicationItem, ConversationItem, NoteTone, QAItem, TagItem, UserSummary } from '@/types/models'
import { stableTone } from '@/utils/stableTone'

type Identity = components['schemas']['PublicIdentityView'] | null
type Recommendation = components['schemas']['RecommendationView']
type TagDto = components['schemas']['TagView']
type ApplicationDto = components['schemas']['ApplicationView']
type ConversationDto = components['schemas']['ConversationView']

const motifOptions = ['book', 'moon', 'gamepad', 'shoes', 'pan', 'camera']
const motifByTone: Record<NoteTone, string> = { yellow: '🎮', blue: '🌙', green: '📖' }

function pickMotif(seed: string | number) {
  const key = typeof seed === 'number' ? seed : Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return motifOptions[key % motifOptions.length]!
}

function relativeTime(value?: string | null) {
  if (!value) return '刚刚'
  const hours = Math.max(0, dayjs().diff(dayjs(value), 'hour'))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  return `${Math.max(1, Math.floor(hours / 24))} 天前`
}

const durationLabels: Record<string, string> = { DAY: '一天', WEEK: '本周', MONTH: '30 天', LONG_TERM: '长期' }

/** 把后端时长枚举渲染成中文标签，避免把 DAY/WEEK 等原始枚举直接暴露给用户 */
export function durationLabel(value?: string | null) {
  return durationLabels[value || ''] || '一段时间'
}

export function identityToUser(identity: Identity, fallbackId: string): UserSummary {
  const name = identity?.displayName || 'TAGO 用户'
  return {
    id: identity?.publicId || fallbackId,
    name,
    // PublicIdentityView 没有 city 字段，用 @publicId 作为身份位置展示
    city: identity?.publicId ? `@${identity.publicId}` : '线上',
    avatar: name.slice(0, 1),
    avatarId: identity?.avatarId,
  }
}

const modeLabels: Record<string, string> = { NATURAL: '自然相遇', PERSONALIZED: '为你挑选' }

export const DEFAULT_TAG_SUMMARY = '正在等待有共鸣的人～'

/** 后端降级排序时 reason 是「按…排序」这类系统说明，不适合当作用户简介展示 */
function recommendationSummary(reason?: string | null) {
  const text = reason?.trim() || ''
  return !text || /^按.*排序$/.test(text) ? '' : text
}

export function publisherSummary(item: TagDto) {
  return [...item.publisherAnswers].sort((a, b) => a.slot - b.slot).find(answer => answer.text.trim())?.text.trim() || ''
}

export function recommendationToTag(item: Recommendation, index: number, generatedAt?: string | null): TagItem {
  const tone = stableTone(item.tagId)
  return {
    id: item.tagId,
    author: identityToUser(item.ownerIdentity, `api-recommendation-${index}`),
    title: item.body.startsWith('#') ? item.body : `# ${item.body}`,
    summary: recommendationSummary(item.reason),
    timeLabel: relativeTime(generatedAt),
    labels: [
      modeLabels[item.mode] || '自然相遇',
      ...item.evidenceRefs.slice(0, 2).map(value => {
        if (value.startsWith('question:')) return `Q${value.slice('question:'.length)} 回答相投`
        if (value.startsWith('profile:')) return '同好关注'
        return value
      }),
    ],
    motif: pickMotif(index),
    tone,
    ctaType: index % 2 ? 'APPLY' : 'DETAIL',
    questions: item.questions.map((question, questionIndex) => ({
      id: `${item.tagId}-${questionIndex}`,
      question,
      answer: '',
    })),
  }
}

export function tagDtoToTag(item: TagDto): TagItem {
  const tone = stableTone(item.id)
  const answers = new Map(item.publisherAnswers.map(answer => [answer.slot, answer.text]))
  const questions: QAItem[] = item.questions.map(question => ({
    id: `${item.id}-${question.slot}`,
    question: question.text || `问题 ${question.slot}`,
    answer: answers.get(question.slot) || '',
  }))
  return {
    id: item.id,
    author: identityToUser(item.ownerIdentity, `api-tag-${item.ownerId}`),
    title: item.body.startsWith('#') ? item.body : `# ${item.body}`,
    summary: publisherSummary(item) || (item.embedding?.state === 'READY' ? DEFAULT_TAG_SUMMARY : '这条 Tag 正在生成更合适的推荐～'),
    timeLabel: relativeTime(item.publishedAt),
    labels: [item.encounterMode === 'ONLINE' ? '线上' : item.encounterMode === 'OFFLINE' ? '线下' : '都可以', durationLabel(item.duration)],
    motif: pickMotif(item.id),
    tone,
    ctaType: 'APPLY',
    questions,
  }
}

export function applicationDtoToItem(item: ApplicationDto, index: number): ApplicationItem {
  const questions = new Map(item.questions.map(question => [question.slot, question.text]))
  return {
    id: item.id,
    applicant: identityToUser(item.applicantIdentity, `api-application-${item.applicantId}`),
    tagTitle: item.tag.body.startsWith('#') ? item.tag.body : `# ${item.tag.body}`,
    message: item.applicantAnswers[0]?.text || '',
    timeLabel: relativeTime(item.submittedAt),
    tone: stableTone(`${item.id}-${index}`),
    answers: item.applicantAnswers.map(answer => ({
      id: `${item.id}-${answer.slot}`,
      question: questions.get(answer.slot) || `问题 ${answer.slot}`,
      answer: answer.text,
    })),
  }
}

export interface ConversationRowMeta {
  marker?: string
  preview?: string
  unread?: number
}

export function conversationDtoToItem(
  item: ConversationDto,
  index: number,
  options?: { meta?: ConversationRowMeta, reasonTag?: string | null },
): ConversationItem {
  const user = identityToUser(item.peerIdentity, `api-conversation-${item.peerId}`)
  // 认识缘由：优先取相遇快照里的 Tag 名（真实数据），否则回退占位文案
  const reasonTag = options?.reasonTag?.trim() || undefined
  const tagTitle = reasonTag ? `# ${reasonTag}` : `与 ${user.name} 的会话`
  const lastActiveAt = item.lastMessagePreview?.sentAt || item.activity?.lastMessageAt || item.createdAt
  const fallbackPreview = item.activity?.state === 'NO_MESSAGES' ? '还没有聊过，先打个招呼吧～' : `建立于${relativeTime(item.createdAt)}`
  return {
    id: item.id,
    peerTinodeUserId: item.peerTinodeUserId,
    user,
    tagTitle,
    reasonTag,
    preview: item.lastMessagePreview?.text?.trim() || options?.meta?.preview || fallbackPreview,
    timeLabel: chatTimeLabel(lastActiveAt),
    lastActiveAt,
    unread: options?.meta?.unread || 0,
    marker: options?.meta?.marker || item.summary?.text?.trim() || undefined,
  }
}

const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 会话列表时间：当天用相对时间，昨天/本周带具体时刻，更早按天数 */
export function chatTimeLabel(value: string, now = dayjs()) {
  const time = dayjs(value)
  const minutes = Math.max(0, now.diff(time, 'minute'))
  if (minutes < 1) return '刚刚'
  if (time.isSame(now, 'day')) return minutes < 60 ? `${minutes}分钟前` : `${Math.floor(minutes / 60)}小时前`
  const days = now.startOf('day').diff(time.startOf('day'), 'day')
  if (days === 1) return `昨天 ${time.format('HH:mm')}`
  if (days < 7 && time.day() < now.day()) return `${weekdayLabels[time.day()]} ${time.format('HH:mm')}`
  return `${days}天前`
}
