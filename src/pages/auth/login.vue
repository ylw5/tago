<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { shallowRef } from 'vue'
import AuthEntryPage from '@/components/auth/AuthEntryPage.vue'

const redirect = shallowRef('/pages/discover/index')

onLoad((query) => {
  if (typeof query?.redirect === 'string' && query.redirect.startsWith('/pages/') && !query.redirect.startsWith('/pages/auth/')) redirect.value = query.redirect
})
</script>

<template>
  <AuthEntryPage initial-mode="login" :redirect="redirect" />
</template>
