import { computed, reactive, shallowRef } from 'vue'
import { getProfile, listAvatars } from '@/api/account'
import { getSession } from '@/api/auth'
import { acceptChatPolicy, getChatPolicy, listChats } from '@/api/chat'
import { getCurrentExposure, getExposureCarousel, getExposureRules, listExposureBids } from '@/api/exposure'
import { blockUser, getMyTag, getOperationStatus, listApplications, unblockUser } from '@/api/social'
import { getWalletBalance, listWalletEntries } from '@/api/wallet'
import type { SettingsRow } from '@/components/business/SettingsGroup.vue'

type ServiceKey = 'session' | 'identity' | 'content' | 'chat' | 'wallet' | 'exposure'
type ServiceStatus = '检查中' | '正常' | '需处理'

export function useServiceOverview() {
  const loading = shallowRef(false)
  const error = shallowRef('')
  const lastSyncedAt = shallowRef('')
  const status = reactive<Record<ServiceKey, ServiceStatus>>({
    session: '检查中', identity: '检查中', content: '检查中', chat: '检查中', wallet: '检查中', exposure: '检查中',
  })
  const initialValues = {
    email: '', avatarCount: '—', applicationCount: '—', conversationCount: '—', tagState: '—',
    chatPolicy: '未读取', balance: '—', entryCount: '—', bidCount: '—', carouselCount: '—', topCoin: '—', rules: '—',
  }
  const values = reactive({ ...initialValues })

  async function probe<T>(key: ServiceKey, task: () => Promise<T>, apply: (result: T) => void) {
    try {
      const result = await task()
      apply(result)
      if (status[key] !== '需处理') status[key] = '正常'
    }
    catch { status[key] = '需处理' }
  }

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    Object.assign(values, initialValues)
    Object.keys(status).forEach(key => { status[key as ServiceKey] = '检查中' })
    try {
      await Promise.all([
        probe('session', getSession, result => { values.email = result.email || '已登录' }),
        probe('identity', getProfile, result => { values.email = result.publicId }),
        probe('identity', listAvatars, result => { values.avatarCount = `${result.length} 张` }),
        probe('content', getMyTag, result => { values.tagState = result.active?.state || result.draft?.state || '未发布' }),
        probe('content', () => listApplications({ direction: 'INCOMING', limit: 1 }), result => { values.applicationCount = `已加载 ${result.items.length} 条` }),
        probe('chat', () => listChats({ limit: 1 }), result => { values.conversationCount = `已加载 ${result.items.length} 个` }),
        probe('chat', getChatPolicy, result => { values.chatPolicy = result.accepted ? '已接受' : '待确认' }),
        probe('wallet', getWalletBalance, result => { values.balance = result.available }),
        probe('wallet', () => listWalletEntries({ limit: 1 }), result => { values.entryCount = `已加载 ${result.length} 条` }),
        probe('exposure', getCurrentExposure, result => { values.topCoin = result.paidCoin }),
        probe('exposure', () => listExposureBids({ limit: 1 }), result => { values.bidCount = `已加载 ${result.items.length} 条` }),
        probe('exposure', () => getExposureCarousel({ limit: 1 }), result => { values.carouselCount = `已加载 ${result.items?.length || 0} 条` }),
        probe('exposure', getExposureRules, result => { values.rules = `起拍 ${result.openingBid}` }),
      ])
      lastSyncedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '服务状态加载失败' }
    finally { loading.value = false }
  }

  const identityRows = computed<SettingsRow[]>(() => [
    { id: 'session', symbol: '会', title: '会话信息', description: '登录状态、账号与会话有效期', value: status.session },
    { id: 'profile', symbol: '人', title: '公开资料', description: values.email || '昵称与公开身份', value: status.identity },
    { id: 'avatars', symbol: '像', title: '头像目录', description: '可用头像与当前选择', value: values.avatarCount },
  ])
  const contentRows = computed<SettingsRow[]>(() => [
    { id: 'tag', symbol: '#', title: 'Tag 状态', description: '草稿、发布、问题与回答链路', value: values.tagState },
    { id: 'applications', symbol: '申', title: '申请记录', description: '收到的申请与处理进度', value: values.applicationCount },
    { id: 'blocks', symbol: '禁', title: '屏蔽管理', description: '屏蔽或解除屏蔽指定用户' },
    { id: 'operation', symbol: '进', title: '操作进度', description: '按幂等键查询异步业务状态' },
  ])
  const walletRows = computed<SettingsRow[]>(() => [
    { id: 'wallet', symbol: '币', title: 'Coin 余额', description: '可用余额与冻结金额', value: values.balance },
    { id: 'ledger', symbol: '流', title: '钱包流水', description: '不可变收支记录', value: values.entryCount },
    { id: 'exposure', symbol: '顶', title: '当前置顶', description: 'TOP、轮播与到期时间', value: `${values.topCoin} Coin` },
    { id: 'bids', symbol: '竞', title: '竞价记录', description: '提交结果与幂等查询', value: values.bidCount },
    { id: 'rules', symbol: '规', title: '曝光规则', description: '起拍价、加价幅度与时长', value: values.rules },
  ])
  const chatRows = computed<SettingsRow[]>(() => [
    { id: 'chats', symbol: '聊', title: '聊天连接', description: '会话、Peer 解析与 Tinode 凭证', value: values.conversationCount },
    { id: 'policy', symbol: '隐', title: '聊天政策', description: '当前隐私政策接受状态', value: values.chatPolicy },
    { id: 'encounters', symbol: '遇', title: '相遇快照', description: '会话中的申请与回答记录' },
  ])

  async function setBlocked(userId: string, blocked: boolean) {
    if (!userId.trim()) throw new Error('请输入用户 ID')
    if (blocked) await blockUser(userId.trim())
    else await unblockUser(userId.trim())
  }

  async function lookupOperation(operation: string, idempotencyKey: string) {
    if (!operation.trim() || !idempotencyKey.trim()) throw new Error('请填写操作名和幂等键')
    return getOperationStatus(operation.trim(), idempotencyKey.trim())
  }

  async function acceptPolicy() {
    const result = await acceptChatPolicy()
    values.chatPolicy = result.accepted ? '已接受' : '待确认'
    return result
  }

  return {
    loading, error, lastSyncedAt, status, identityRows, contentRows, walletRows, chatRows,
    load, setBlocked, lookupOperation, acceptPolicy,
  }
}
