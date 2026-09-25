<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
  error?: string
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  loading: false,
  error: '',
  empty: false,
  emptyTitle: '这里还没有内容',
  emptyDescription: '有新内容时，会显示在这里。',
})

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <view class="async-state">
  <view class="async-state__content">
    <slot />
  </view>
  <view v-if="loading" class="state" aria-live="polite">
    <view class="state__spinner" />
    <text class="state__title">正在连接 TAGO</text>
    <text class="state__description">稍等一下，正在把最新内容带回来。</text>
  </view>
  <view v-else-if="error" class="state state--error" role="alert">
    <text class="state__mark">!</text>
    <text class="state__title">暂时没有连接上</text>
    <text class="state__description">{{ error }}</text>
    <button class="state__button" @click="emit('retry')">重新加载</button>
  </view>
  <view v-else-if="empty" class="state">
    <slot name="empty-icon">
      <svg class="state__empty-icon" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="46" fill="var(--tago-primary-weak)" />
        <path d="m19 49 11-20h36l11 20v20a6 6 0 0 1-6 6H25a6 6 0 0 1-6-6V49Z" fill="var(--tago-paper)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19 49h19a10 10 0 0 0 20 0h19M40 19v-5m16 5v-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </slot>
    <text class="state__title">{{ emptyTitle }}</text>
    <text class="state__description">{{ emptyDescription }}</text>
  </view>
  </view>
</template>

<style scoped lang="scss">
.async-state { display:grid; flex:1; grid-template-columns:minmax(0,1fr); min-height:0; }
.async-state__content,.state { grid-area:1/1; }
.state { z-index:1; display:flex; min-height:360rpx; flex-direction:column; align-items:center; justify-content:center; width:100%; padding:48rpx 32rpx; color:var(--tago-muted); text-align:center; background:var(--tago-paper, #f8f4e9); }
.state__spinner { width:42rpx; height:42rpx; margin-bottom:22rpx; border:5rpx solid rgba(32,88,79,.14); border-top-color:var(--tago-primary); border-radius:50%; animation:spin .8s linear infinite; }
.state__mark { display:grid; place-items:center; width:62rpx; height:62rpx; margin-bottom:18rpx; color:var(--tago-primary); border-radius:50%; background:var(--tago-note-yellow); font-size:34rpx; font-weight:900; transform:rotate(-4deg); }
.state__empty-icon { width:112rpx; height:112rpx; flex:none; margin-bottom:24rpx; color:var(--tago-primary); }
.state__title { color:var(--tago-ink); font-size:30rpx; font-weight:850; }
.state__description { max-width:520rpx; margin-top:10rpx; font-size:22rpx; line-height:1.65; }
.state__button { min-width:210rpx; height:68rpx; margin-top:24rpx; padding:0 28rpx; color:#fff; border-radius:999rpx; background:var(--tago-primary); font-size:24rpx; line-height:68rpx; }
.state__button::after { border:0; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
