<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { listApplications } from '@/api/social'
import { ensureBackendSession } from '@/composables/useBackendSession'
import { ensureTinodeSession, tinodeSession } from '@/composables/useTinodeSession'

withDefaults(defineProps<{ active:'discover'|'meet'|'create' }>(), { active:'discover' })
const hasUnread = computed(() => [...tinodeSession.unread.value.values()].some(count => count > 0))
const hasApplication = shallowRef(false)
const showBadge = computed(() => hasUnread.value || hasApplication.value)
onMounted(() => {
  void ensureBackendSession().then(() => {
    void ensureTinodeSession().catch(() => {})
    return listApplications({ direction:'INCOMING', state:'PENDING', limit:1 })
  }).then(page => { hasApplication.value = page.items.length > 0 }).catch(() => {})
})
function navigate(path:string) { uni.redirectTo({ url:path }) }
</script>

<template>
  <view class="tabs">
    <button class="tabs__item" :class="{ 'tabs__item--active':active==='discover' }" @click="navigate('/pages/discover/index')">
      <svg v-if="active==='discover'" class="icon-home" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M4 19v-9q0-.475.213-.9t.587-.7l6-4.5q.525-.4 1.2-.4t1.2.4l6 4.5q.375.275.588.7T20 10v9q0 .825-.588 1.413T18 21h-3q-.425 0-.712-.288T14 20v-5q0-.425-.288-.712T13 14h-2q-.425 0-.712.288T10 15v5q0 .425-.288.713T9 21H6q-.825 0-1.412-.587T4 19" />
      </svg>
      <svg v-else class="icon-home" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M6 19h3v-5q0-.425.288-.712T10 13h4q.425 0 .713.288T15 14v5h3v-9l-6-4.5L6 10zm-2 0v-9q0-.475.213-.9t.587-.7l6-4.5q.525-.4 1.2-.4t1.2.4l6 4.5q.375.275.588.7T20 10v9q0 .825-.588 1.413T18 21h-4q-.425 0-.712-.288T13 20v-5h-2v5q0 .425-.288.713T10 21H6q-.825 0-1.412-.587T4 19m8-6.75" />
      </svg>
      <text>发现</text>
    </button>
    <button class="tabs__create" aria-label="发布 Tag" @click="navigate('/pages/tag/compose')"><i class="icon-plus"><b class="icon-spark"></b></i><text>发Tag</text></button>
    <button class="tabs__item" :class="{ 'tabs__item--active':active==='meet' }" :aria-label="showBadge ? '相遇，有未读消息或待处理申请' : '相遇'" @click="navigate('/pages/meet/index')">
      <view class="tabs__meet-icon">
        <svg v-if="active==='meet'" class="icon-people" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21.987 18.73a2 2 0 0 1-.34.85a1.9 1.9 0 0 1-1.56.8h-1.651a.74.74 0 0 1-.6-.31a.76.76 0 0 1-.11-.67c.37-1.18.29-2.51-3.061-4.64a.77.77 0 0 1-.32-.85a.76.76 0 0 1 .72-.54a7.61 7.61 0 0 1 6.792 4.39a2 2 0 0 1 .13.97M19.486 7.7a4.43 4.43 0 0 1-4.421 4.42a.76.76 0 0 1-.65-1.13a6.16 6.16 0 0 0 0-6.53a.75.75 0 0 1 .61-1.18a4.3 4.3 0 0 1 3.13 1.34a4.46 4.46 0 0 1 1.291 3.12z" />
          <path fill="currentColor" d="M16.675 18.7a2.65 2.65 0 0 1-1.26 2.48c-.418.257-.9.392-1.39.39H4.652a2.63 2.63 0 0 1-1.39-.39A2.62 2.62 0 0 1 2.01 18.7a2.6 2.6 0 0 1 .5-1.35a8.8 8.8 0 0 1 6.812-3.51a8.78 8.78 0 0 1 6.842 3.5a2.7 2.7 0 0 1 .51 1.36M14.245 7.32a4.92 4.92 0 0 1-4.902 4.91a4.903 4.903 0 0 1-4.797-5.858a4.9 4.9 0 0 1 6.678-3.57a4.9 4.9 0 0 1 3.03 4.518z" />
        </svg>
        <svg v-else class="icon-people" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.928 19.634h2.138a1.165 1.165 0 0 0 1.116-1.555a6.85 6.85 0 0 0-6.117-3.95m0-2.759a3.664 3.664 0 0 0 3.665-3.664a3.664 3.664 0 0 0-3.665-3.674m-1.04 16.795a1.908 1.908 0 0 0 1.537-3.035a8.03 8.03 0 0 0-6.222-3.196a8.03 8.03 0 0 0-6.222 3.197a1.909 1.909 0 0 0 1.536 3.034zM9.34 11.485a4.16 4.16 0 0 0 4.15-4.161a4.151 4.151 0 0 0-8.302 0a4.16 4.16 0 0 0 4.151 4.16" />
        </svg>
        <i v-if="showBadge" class="tabs__badge" aria-hidden="true" />
      </view>
      <text>相遇</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
.tabs {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  max-width: var(--tago-content-width);
  height: calc(96rpx + env(safe-area-inset-bottom));
  margin: 0 auto;
  padding: 0 28rpx calc(10rpx + env(safe-area-inset-bottom));
  overflow: visible;
  border-radius: 40rpx 40rpx 0 0;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(33, 68, 55, .08);
}

.tabs__item,
.tabs__create {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  line-height: 1;
}

.tabs__item::after,
.tabs__create::after { border: 0; }

.tabs__item {
  width: 140rpx;
  height: 74rpx;
  color: #8d948f;
  font-size: 22rpx;
  font-weight: 650;
}

.tabs__item--active { color: var(--tago-primary); }

.tabs__item svg {
  display: block;
  width: 46rpx;
  height: 46rpx;
  margin-bottom: 6rpx;
  color: var(--tago-primary);
}

.tabs__meet-icon { position:relative; width:46rpx; height:46rpx; margin-bottom:6rpx; }
.tabs__meet-icon svg { margin-bottom:0; }
.tabs__badge { position:absolute; top:-4rpx; right:-4rpx; width:16rpx; height:16rpx; border:3rpx solid #fff; border-radius:50%; background:var(--tago-danger); }

.tabs__create {
  position: relative;
  width: 150rpx;
  height: 74rpx;
  color: var(--tago-primary);
  font-size: 22rpx;
  font-weight: 700;
}

.icon-plus {
  position: absolute;
  bottom: 30rpx;
  left: 50%;
  display: block;
  width: 88rpx;
  height: 88rpx;
  margin: 0;
  transform: translateX(-50%);
  border-radius: 50%;
  background: var(--tago-primary);
  box-shadow: 0 8rpx 16rpx rgba(32, 88, 79, .2);
}

.icon-spark {
  position: absolute;
  top: 4rpx;
  left: -22rpx;
  width: 7rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: var(--tago-accent);
  transform: rotate(-32deg);
  box-shadow: 12rpx 8rpx 0 -1rpx var(--tago-accent);
}

.icon-plus::before,
.icon-plus::after {
  content: '';
  position: absolute;
  top: 42rpx;
  left: 26rpx;
  width: 36rpx;
  height: 4rpx;
  border-radius: 9rpx;
  background: #fff;
}

.icon-plus::after { transform: rotate(90deg); }
</style>
