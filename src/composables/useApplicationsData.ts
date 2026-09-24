import { computed, shallowRef } from 'vue'
import { applicationDtoToItem } from '@/api/adapters'
import { acceptApplication, listApplications, rejectApplication } from '@/api/social'
import type { ApplicationItem } from '@/types/models'
import { ensureBackendSession } from './useBackendSession'

export function useApplicationsData() {
  const applications = shallowRef<ApplicationItem[]>([])
  const loading = shallowRef(false)
  const error = shallowRef('')

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      await ensureBackendSession()
      const page = await listApplications({ direction: 'INCOMING', state: 'PENDING', limit: 30 })
      applications.value = page.items.map(applicationDtoToItem)
    }
    catch (cause) {
      applications.value = []
      error.value = cause instanceof Error ? cause.message : '申请列表加载失败'
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
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load,
    accept,
    decline,
  }
}
