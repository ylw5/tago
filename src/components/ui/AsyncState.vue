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
  emptyDescription: '新的相遇正在路上。',
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
    <text class="state__sprout">⌁</text>
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
.state__mark,.state__sprout { display:grid; place-items:center; width:62rpx; height:62rpx; margin-bottom:18rpx; color:var(--tago-primary); border-radius:50%; background:var(--tago-note-yellow); font-size:34rpx; font-weight:900; transform:rotate(-4deg); }
.state__sprout { background:var(--tago-primary-weak); }
.state__title { color:var(--tago-ink); font-size:30rpx; font-weight:850; }
.state__description { max-width:520rpx; margin-top:10rpx; font-size:22rpx; line-height:1.65; }
.state__button { min-width:210rpx; height:68rpx; margin-top:24rpx; padding:0 28rpx; color:#fff; border-radius:999rpx; background:var(--tago-primary); font-size:24rpx; line-height:68rpx; }
.state__button::after { border:0; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
