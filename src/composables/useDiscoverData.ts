import { computed, shallowRef } from 'vue'
import { getCurrentExposure, getExposureCarousel, getExposureRules } from '@/api/exposure'
import { getProfile } from '@/api/account'
import { DEFAULT_TAG_SUMMARY, publisherSummary, recommendationToTag, tagDtoToTag } from '@/api/adapters'
import { getDiscovery, getMyTag, getPublicTag, listApplications, refreshDiscovery } from '@/api/social'
import { ensureBackendSession } from './useBackendSession'
import type { TagItem } from '@/types/models'

export interface DiscoverExposureTag extends TagItem {
  entitlementId: string
  expiresAt?: string | null
  durationSeconds?: number
  serverOffset: number
}

export function useDiscoverData() {
  const tags = shallowRef<TagItem[]>([])
  const featuredTag = shallowRef<DiscoverExposureTag | null>(null)
  const carouselTags = shallowRef<DiscoverExposureTag[]>([])
  const currentTag = shallowRef('')
  const displayName = shallowRef('我')
  const avatarId = shallowRef('')
  const loading = shallowRef(false)
  const refreshing = shallowRef(false)
  const error = shallowRef('')
  const exposureError = shallowRef('')
  const currentTagError = shallowRef('')
  const authenticated = shallowRef(false)
  const pendingTagIds = shallowRef<Set<string>>(new Set())

  function message(cause: unknown) { return cause instanceof Error ? cause.message : '加载失败，请重试' }
  function detailLoader() {
    const cache = new Map<string, ReturnType<typeof getPublicTag>>()
    return (id: string) => {
      if (!cache.has(id)) cache.set(id, getPublicTag(id))
      return cache.get(id)!
    }
  }
  /** 推荐接口不返回发布者简介，异步用 Tag 详情里的第一条发布者回答补齐卡片副标题 */
  async function fillSummaries<T extends TagItem>(items: T[], detail: ReturnType<typeof detailLoader>) {
    const results = await Promise.allSettled(items.map(item => detail(item.id)))
    return items.map((item, index) => {
      const result = results[index]!
      const summary = result.status === 'fulfilled' ? publisherSummary(result.value) : ''
      return { ...item, summary: summary || item.summary || DEFAULT_TAG_SUMMARY }
    })
  }
  function applySummaries(detail: ReturnType<typeof detailLoader>) {
    const list = tags.value
    void fillSummaries(list, detail).then(next => { if (tags.value === list) tags.value = next })
  }
  function withPending(tag: TagItem): TagItem { return pendingTagIds.value.has(tag.id) ? { ...tag, ctaType: 'WAITING' } : tag }

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    exposureError.value = ''
    currentTagError.value = ''
    pendingTagIds.value = new Set()
    try {
      await ensureBackendSession()
      authenticated.value = true
      const [discovery, mine, exposure, carousel, rules, profile, outgoing] = await Promise.allSettled([
        getDiscovery(), getMyTag(), getCurrentExposure(), getExposureCarousel({ limit: 20 }), getExposureRules(), getProfile(), listApplications({ direction: 'OUTGOING', state: 'PENDING', limit: 30 }),
      ])
      if (outgoing.status === 'fulfilled') pendingTagIds.value = new Set(outgoing.value.items.map(item => item.tagId))
      if (profile.status === 'fulfilled') {
        displayName.value = profile.value.displayName || '我'
        avatarId.value = profile.value.avatarId
      }
      if (mine.status === 'fulfilled') currentTag.value = mine.value.active?.body || ''
      else currentTagError.value = message(mine.reason)
      const durationSeconds = rules.status === 'fulfilled' ? rules.value.entitlementSeconds : undefined
      const now = exposure.status === 'fulfilled' ? exposure.value.serverTime : undefined
      const serverOffset = now && Number.isFinite(Date.parse(now)) ? Date.parse(now) - Date.now() : 0
      const detail = detailLoader()
      featuredTag.value = null
      if (exposure.status === 'fulfilled' && exposure.value.tagId) {
        const top = exposure.value
        try {
          featuredTag.value = { ...tagDtoToTag(await detail(top.tagId!)), price: Number(top.paidCoin), entitlementId: top.entitlementId || top.tagId!, expiresAt: top.expiresAt, durationSeconds, serverOffset }
        } catch (cause) { exposureError.value = message(cause) }
      } else if (exposure.status === 'rejected') exposureError.value = message(exposure.reason)
      carouselTags.value = []
      if (carousel.status === 'fulfilled') {
        const results = await Promise.allSettled((carousel.value.items || []).filter(item => item.tagId).map(async item => ({
          ...tagDtoToTag(await detail(item.tagId!)), price: Number(item.paidCoin), entitlementId: item.entitlementId || item.tagId!, expiresAt: item.expiresAt, durationSeconds, serverOffset,
        })))
        carouselTags.value = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
        if (results.some(result => result.status === 'rejected')) exposureError.value = '部分置顶内容加载失败，请重试'
      } else exposureError.value = message(carousel.reason)
      if (discovery.status === 'fulfilled') {
        const recommended = discovery.value.items
        tags.value = recommended.filter(item => item.tagId !== featuredTag.value?.id).map((item, index) => withPending(recommendationToTag(item, index, discovery.value.generatedAt)))
        applySummaries(detail)
      } else error.value = message(discovery.reason)
    } catch (cause) {
      authenticated.value = false
      tags.value = []
      featuredTag.value = null
      carouselTags.value = []
      currentTag.value = ''
      error.value = message(cause)
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    if (loading.value || refreshing.value) return false
    refreshing.value = true
    try {
      await ensureBackendSession()
      const [discovery, outgoing] = await Promise.all([refreshDiscovery(), listApplications({ direction: 'OUTGOING', state: 'PENDING', limit: 30 })])
      pendingTagIds.value = new Set(outgoing.items.map(item => item.tagId))
      tags.value = discovery.items.filter(item => item.tagId !== featuredTag.value?.id).map((item, index) => withPending(recommendationToTag(item, index, discovery.generatedAt)))
      const list = tags.value
      void fillSummaries(list, detailLoader()).then(next => { if (tags.value === list) tags.value = next })
      error.value = ''
      return true
    } catch {
      return false
    } finally {
      refreshing.value = false
    }
  }

  return { tags: computed(() => tags.value), featuredTag, carouselTags, currentTag, displayName, avatarId, loading, refreshing, error, exposureError, currentTagError, authenticated, load, refresh }
}
