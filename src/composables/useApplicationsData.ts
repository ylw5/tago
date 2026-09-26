import { computed, shallowRef } from 'vue'
import { applicationDtoToItem } from '@/api/adapters'
import { acceptApplication, listApplications, rejectApplication } from '@/api/social'
import type { ApplicationItem } from '@/types/models'
import { ensureBackendSession } from './useBackendSession'

function failureMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

export function useApplicationsData() {
  const applications = shallowRef<ApplicationItem[]>([])
  const outgoing = shallowRef<ApplicationItem[]>([])
  const loading = shallowRef(false)
  const incomingError = shallowRef('')
  const outgoingError = shallowRef('')

  async function load() {
    if (loading.value) return
    loading.value = true
    incomingError.value = ''
    outgoingError.value = ''
    try {
      await ensureBackendSession()
      const [received, sent] = await Promise.allSettled([
        listApplications({ direction: 'INCOMING', state: 'PENDING', limit: 30 }),
        listApplications({ direction: 'OUTGOING', limit: 30 }),
      ])
      if (received.status === 'fulfilled') {
        applications.value = received.value.items.map((item, index) => applicationDtoToItem(item, index, 'incoming'))
      }
      else {
        applications.value = []
        incomingError.value = failureMessage(received.reason, '申请列表加载失败')
      }
      if (sent.status === 'fulfilled') {
        const items = sent.value.items.map((item, index) => applicationDtoToItem(item, index, 'outgoing'))
        outgoing.value = [...items.filter(item => item.state === 'PENDING'), ...items.filter(item => item.state !== 'PENDING')]
      }
      else {
        outgoing.value = []
        outgoingError.value = failureMessage(sent.reason, '发出的申请加载失败')
      }
    }
    catch (cause) {
      applications.value = []
      outgoing.value = []
      const message = failureMessage(cause, '申请列表加载失败')
      incomingError.value = message
      outgoingError.value = message
    }
    finally {
      loading.value = false
    }
  }

  async function accept(id: string) {
    const acceptance = await acceptApplication(id)
    applications.value = applications.value.filter(item => item.id !== id)
    return acceptance
  }

  async function decline(id: string) {
    await rejectApplication(id)
    applications.value = applications.value.filter(item => item.id !== id)
  }

  return {
    applications: computed(() => applications.value),
    outgoing: computed(() => outgoing.value),
    loading: computed(() => loading.value),
    error: computed(() => incomingError.value),
    incomingError: computed(() => incomingError.value),
    outgoingError: computed(() => outgoingError.value),
    load,
    accept,
    decline,
  }
}
