import { computed, shallowRef } from 'vue'
import { getCurrentExposure, getExposureCarousel, getExposureRules } from '@/api/exposure'
import { getProfile } from '@/api/account'
import { recommendationToTag, tagDtoToTag } from '@/api/adapters'
import { getDiscovery, getMyTag, getPublicTag, refreshDiscovery } from '@/api/social'
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
  const loading = shallowRef(false)
  const refreshing = shallowRef(false)
  const error = shallowRef('')
  const exposureError = shallowRef('')
  const currentTagError = shallowRef('')
  const authenticated = shallowRef(false)

  function message(cause: unknown) { return cause instanceof Error ? cause.message : '加载失败，请重试' }

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    exposureError.value = ''
    currentTagError.value = ''
    try {
      await ensureBackendSession()
      authenticated.value = true
      const [discovery, mine, exposure, carousel, rules, profile] = await Promise.allSettled([
        getDiscovery(), getMyTag(), getCurrentExposure(), getExposureCarousel({ limit: 20 }), getExposureRules(), getProfile(),
      ])
      if (profile.status === 'fulfilled') displayName.value = profile.value.displayName || '我'
      if (mine.status === 'fulfilled') currentTag.value = (mine.value.active || mine.value.draft)?.body || ''
      else currentTagError.value = message(mine.reason)
      const durationSeconds = rules.status === 'fulfilled' ? rules.value.entitlementSeconds : undefined
      const now = exposure.status === 'fulfilled' ? exposure.value.serverTime : undefined
      const serverOffset = now && Number.isFinite(Date.parse(now)) ? Date.parse(now) - Date.now() : 0
      const cache = new Map<string, ReturnType<typeof getPublicTag>>()
      const detail = (id: string) => {
        if (!cache.has(id)) cache.set(id, getPublicTag(id))
        return cache.get(id)!
      }
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
        if (!featuredTag.value && recommended[0]?.tagId) {
          try {
            const first = recommended[0]
            featuredTag.value = { ...tagDtoToTag(await detail(first.tagId)), price: 200, entitlementId: `discovery-${first.tagId}`, durationSeconds, serverOffset }
          } catch (cause) { exposureError.value = message(cause) }
        }
        tags.value = recommended.filter(item => item.tagId !== featuredTag.value?.id).map((item, index) => recommendationToTag(item, index, discovery.value.generatedAt))
        if (!carouselTags.value.length) {
          carouselTags.value = recommended.filter(item => item.tagId !== featuredTag.value?.id).slice(0, 2).map((item, index) => ({
            ...recommendationToTag(item, index, discovery.value.generatedAt),
            price: index ? 180 : 150,
            entitlementId: `discovery-carousel-${item.tagId}`,
            durationSeconds,
            serverOffset,
          }))
        }
      } else error.value = message(discovery.reason)
    } catch (cause) {
      authenticated.value = false
      tags.value = []
      featuredTag.value = null
      carouselTags.value = []
      currentTag.value = ''
      error.value = message(cause)
    } finally { loading.value = false }
  }

  async function refresh() {
    if (loading.value || refreshing.value) return
    refreshing.value = true
    error.value = ''
    try {
      await ensureBackendSession()
      const discovery = await refreshDiscovery()
      tags.value = discovery.items.filter(item => item.tagId !== featuredTag.value?.id).map((item, index) => recommendationToTag(item, index, discovery.generatedAt))
    } catch (cause) { error.value = message(cause) }
    finally { refreshing.value = false }
  }

  return { tags: computed(() => tags.value), featuredTag, carouselTags, currentTag, displayName, loading, refreshing, error, exposureError, currentTagError, authenticated, load, refresh }
}
