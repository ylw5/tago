<script setup lang="ts">
import type { UserSummary } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'
import { goBack } from '@/utils/navigation'
defineProps<{ user:UserSummary; tagTitle:string; day:number }>()
const emit = defineEmits<{ answers:[] }>()
</script>

<template>
  <view class="context">
    <view class="context__nav"><view class="context__back" aria-label="返回" @click="goBack">‹</view><AvatarBadge :user="user" /><view class="context__identity"><text class="context__name">{{ user.name }}</text><text>因为 {{ tagTitle }} 而认识 · 第 {{ day }} 天</text></view><view class="context__more" aria-label="更多">•••</view></view>
    <view class="context__paper">
      <view class="context__reason"><text>你们因为</text><view><text class="context__tag">{{ tagTitle }}</text><text>而认识</text></view><text class="context__summary">或许好的书，会让两个陌生人靠得更近 :)</text></view>
      <button class="context__answers" @click="emit('answers')">看看彼此当时的回答　→</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.context { padding:calc(8rpx + env(safe-area-inset-top)) 24rpx 10rpx; background:var(--tago-paper-white); }.context__nav { display:flex; align-items:center; gap:10rpx; min-height:70rpx; color:var(--tago-muted); font-size:16rpx; }.context__back { display:grid; flex:none; place-items:center; width:40rpx; height:55rpx; color:#222; font-size:54rpx; line-height:1; }.context__identity { display:flex; min-width:0; flex:1; flex-direction:column; }.context__name { color:var(--tago-ink); font-size:25rpx; font-weight:850; }.context__more { display:grid; flex:none; place-items:center; width:45rpx; height:45rpx; color:#222; font-size:27rpx; font-weight:900; }
.context__paper { position:relative; min-height:150rpx; margin-top:7rpx; padding:17rpx 20rpx; overflow:hidden; border-radius:10rpx 22rpx 12rpx 16rpx; background:linear-gradient(110deg,#edf6df,#e2f0d8); box-shadow:var(--tago-shadow); }.context__reason { display:flex; width:100%; flex-direction:column; gap:6rpx; padding-right:150rpx; font-size:18rpx; }.context__reason > view { display:flex; align-items:center; gap:8rpx; font-size:20rpx; }.context__tag { padding:6rpx 10rpx; background:var(--tago-note-yellow); font-size:23rpx; font-weight:850; white-space:nowrap; }.context__summary { color:#667069; font-size:16rpx; line-height:1.45; }.context__answers { position:absolute; right:12rpx; bottom:11rpx; width:max-content; height:39rpx; padding:0 13rpx; color:var(--tago-primary); border:2rpx solid var(--tago-primary); border-radius:999rpx; background:rgba(255,255,255,.86); font-size:15rpx; line-height:35rpx; }
</style>
