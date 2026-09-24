import { onMounted, onUnmounted, shallowRef } from 'vue'
import type { DiscoverExposureTag } from './useDiscoverData'

export function useExposureProgress() {
  const now = shallowRef(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    now.value = Date.now()
    timer = setInterval(() => { now.value = Date.now() }, 1000)
  })
  onUnmounted(() => clearInterval(timer))

  return (tag: Pick<DiscoverExposureTag, 'expiresAt' | 'durationSeconds' | 'serverOffset'>) => {
    const expiresAt = Date.parse(tag.expiresAt || '')
    const duration = tag.durationSeconds
    if (!Number.isFinite(expiresAt) || !duration || !Number.isFinite(duration) || duration <= 0) return null
    return Math.min(100, Math.max(0, (expiresAt - now.value - tag.serverOffset) / (duration * 1000) * 100))
  }
}
