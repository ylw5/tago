export type NoteTone = 'yellow' | 'blue' | 'green'
export type TagCta = 'APPLY' | 'DETAIL' | 'WAITING' | 'NONE'

export interface UserSummary {
  id: string
  name: string
  city: string
  avatar: string
  avatarId?: string
}

export interface QAItem {
  id: string
  question: string
  answer: string
}

export interface TagItem {
  id: string
  author: UserSummary
  title: string
  summary: string
  timeLabel: string
  labels: string[]
  motif: string
  tone: NoteTone
  ctaType: TagCta
  questions?: QAItem[]
  price?: number
}

export type ApplicationDirection = 'incoming' | 'outgoing'
export type ApplicationState = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export interface ApplicationItem {
  id: string
  direction: ApplicationDirection
  state: ApplicationState
  conversationId: string | null
  /** 列表上展示的对方：收到的是申请人，发出的是 Tag 主人 */
  peer: UserSummary
  applicant: UserSummary
  tagTitle: string
  message: string
  timeLabel: string
  tone: NoteTone
  answers: QAItem[]
}

export interface ConversationItem {
  peerTinodeUserId?: string | null
  id: string
  user: UserSummary
  tagTitle: string
  /** 认识缘由的 Tag 原文；没有相遇快照时为空 */
  reasonTag?: string
  preview: string
  /** 预览对应的会话内序号；实时消息只在序号更大时覆盖 */
  previewSeq: number
  timeLabel: string
  /** 最近一次活动时间（ISO），用于折叠长期未联系的会话 */
  lastActiveAt: string
  unread: number
  marker?: string
}

export interface ChatMessage {
  id: string
  side: 'mine' | 'theirs' | 'system' | 'gift'
  content: string
  time?: string
  read?: boolean
  giftTitle?: string
  giftMeaning?: string
}

export interface GiftMoment {
  id: string
  month: string
  title: string
  from: string
  story: string
  date: string
  motif: string
  tone: NoteTone
  side: 'left' | 'right'
}
