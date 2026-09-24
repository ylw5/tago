import { computed, shallowRef } from 'vue'
import { conversationDtoToItem } from '@/api/adapters'
import { getChatDetail, listChats, resolveChatPeers } from '@/api/chat'
import { FIXTURES_ENABLED } from '@/api/client'
import { conversationRowMeta } from '@/mocks/fixtures'
import type { ConversationItem } from '@/types/models'
import { ensureBackendSession } from './useBackendSession'

/** 相遇摘要可能是 Tag 原文，也可能包在「」里。 */
function reasonTagFromSummary(summary?: string | null): string | null {
  const matched = summary?.match(/「(.+?)」/)
  return matched?.[1] ?? summary?.trim() ?? null
}

export function useMeetData() {
  const conversations = shallowRef<ConversationItem[]>([])
  const loading = shallowRef(false)
  const error = shallowRef('')

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      await ensureBackendSession()
      const page = await listChats({ limit: 30 })
      const handles = page.items.map(item => item.peerTinodeUserId).filter((value): value is string => Boolean(value))
      const resolved = handles.length ? await resolveChatPeers(handles) : page.items
      const sourceItems = resolved.length ? resolved : page.items
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
    }
  }

  return {
    conversations: computed(() => conversations.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load,
  }
}
