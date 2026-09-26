import { computed, shallowRef, watch } from 'vue'
import { applyLivePreview, conversationDtoToItem } from '@/api/adapters'
import { getChatDetail, listChats, resolveChatPeers } from '@/api/chat'
import { FIXTURES_ENABLED } from '@/api/client'
import { conversationRowMeta } from '@/mocks/fixtures'
import type { ConversationItem } from '@/types/models'
import { ensureBackendSession } from './useBackendSession'
import { ensureTinodeSession, tinodeSession } from './useTinodeSession'

/** 相遇摘要可能是 Tag 原文，也可能包在「」里。 */
function reasonTagFromSummary(summary?: string | null): string | null {
  const matched = summary?.match(/「(.+?)」/)
  return matched?.[1] ?? summary?.trim() ?? null
}

export function useMeetData() {
  const conversations = shallowRef<ConversationItem[]>([])
  const loading = shallowRef(false)
  const error = shallowRef('')

  const resolving = new Set<string>()
  async function resolveMissing() {
    if (loading.value || FIXTURES_ENABLED || !tinodeSession.client.value) return
    const peers = [...tinodeSession.unread.value].filter(([peer, count]) => count > 0 && !resolving.has(peer) && !conversations.value.some(item => item.peerTinodeUserId === peer)).map(([peer]) => peer)
    for (let offset = 0; offset < peers.length; offset += 100) {
      const batch = peers.slice(offset, offset + 100)
      batch.forEach(peer => resolving.add(peer))
      const session = tinodeSession.client.value
      try {
        const resolved = await resolveChatPeers(batch)
        if (session !== tinodeSession.client.value) return
        const additions = resolved.filter(item => !conversations.value.some(existing => existing.id === item.id))
        conversations.value = [...conversations.value, ...additions.map((item, index) => conversationDtoToItem(item, conversations.value.length + index, {reasonTag: reasonTagFromSummary(item.firstEncounter?.summary)}))]
      } catch { /* 下次未读更新或列表加载时重试映射。 */ }
      finally { batch.forEach(peer => resolving.delete(peer)) }
    }
  }
  watch([tinodeSession.unread, tinodeSession.client], () => { void resolveMissing() })

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      await ensureBackendSession()
      if (!FIXTURES_ENABLED) void ensureTinodeSession().catch(() => {})
      const page = await listChats({ limit: 30 })
      const sourceItems = page.items
      // 列表已带首次相遇快照；旧版后端没有该字段时才逐个取详情还原「因为 #xx 而认识」
      const items = await Promise.all(sourceItems.map(async (item, index) => {
        let reasonTag: string | null = null
        if (item.firstEncounter !== undefined) {
          reasonTag = reasonTagFromSummary(item.firstEncounter?.summary)
        }
        else try {
          const detail = await getChatDetail(item.id, { silent: true })
          const encounters = [detail.firstEncounter, detail.latestEncounter]
          reasonTag = encounters.map(encounter => reasonTagFromSummary(encounter?.summary)).find(Boolean) ?? null
        }
        catch {
          reasonTag = null
        }
        const meta = FIXTURES_ENABLED ? conversationRowMeta[item.id] : undefined
        return conversationDtoToItem(item, index, { meta, reasonTag })
      }))
      conversations.value = items
    }
    catch (cause) {
      conversations.value = []
      error.value = cause instanceof Error ? cause.message : '会话列表加载失败'
    }
    finally {
      loading.value = false
      void resolveMissing()
    }
  }

  return {
    conversations: computed(() => conversations.value.map(item => {
      const unread = FIXTURES_ENABLED ? item.unread : tinodeSession.unread.value.get(item.peerTinodeUserId || '') ?? 0
      const live = FIXTURES_ENABLED ? undefined : tinodeSession.previews.value.get(item.peerTinodeUserId || '')
      return applyLivePreview({ ...item, unread }, live)
    })),
    unreadError: tinodeSession.error,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load,
  }
}
