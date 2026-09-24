<script setup lang="ts">
import type { UserSummary } from '@/types/models'
import AvatarImage from '@/components/ui/AvatarImage.vue'
defineProps<{ user: UserSummary; size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <view class="avatar" :class="`avatar--${size ?? 'md'}`" :aria-label="`${user.name}的头像`">
    <AvatarImage v-if="user.avatarId" :id="user.avatarId" />
    <text v-else>{{ user.avatar }}</text>
  </view>
</template>

<style scoped lang="scss">
.avatar { position:relative; display:grid; place-items:center; flex:none; overflow:hidden; border:4rpx solid rgba(255,255,255,.96); border-radius:50%; color:white; background:#90a99f; box-shadow:0 3rpx 10rpx rgba(35,72,60,.16); }
.avatar .avatar-image { width:100%; height:100%; }
.avatar--sm { width:58rpx; height:58rpx; font-size:20rpx; }
.avatar--md { width:66rpx; height:66rpx; font-size:23rpx; }
.avatar--lg { width:76rpx; height:76rpx; font-size:27rpx; }
</style>
