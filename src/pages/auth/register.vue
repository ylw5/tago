<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { shallowRef } from 'vue'
import AuthEntryPage from '@/components/auth/AuthEntryPage.vue'

// 路由 query 会作为 attrs 传入，不能覆盖根组件已校验的 redirect。
defineOptions({ inheritAttrs: false })

const redirect = shallowRef('/pages/discover/index')

onLoad((query) => {
  if (typeof query?.redirect === 'string' && query.redirect.startsWith('/pages/') && !query.redirect.startsWith('/pages/auth/')) redirect.value = query.redirect
})
</script>

<template>
  <AuthEntryPage initial-mode="register" :redirect="redirect" />
</template>
