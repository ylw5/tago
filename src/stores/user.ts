import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { resetTinodeSession } from '@/composables/useTinodeSession'
import type { components } from '@/api/types/generated'

type SessionView = components['schemas']['SessionView']

export const useUserStore = defineStore('user', () => {
  const session = shallowRef<SessionView | null>(null)
  const isAuthenticated = computed(() => Boolean(session.value?.authenticated))

  function setSession(value: SessionView | null) {
    if (session.value?.userId !== value?.userId || session.value?.loginId !== value?.loginId || !value?.authenticated) resetTinodeSession()
    session.value = value
  }
  function clear() { resetTinodeSession(); session.value = null }

  return { session, isAuthenticated, setSession, clear }
}, { persist: true })

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
