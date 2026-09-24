<script setup lang="ts">
import { computed } from 'vue'
import type { ConversationItem } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'

const props = withDefaults(defineProps<{ conversation: ConversationItem; index?: number }>(), { index: 0 })
const emit = defineEmits<{ select: [id: string] }>()
const tones = ['yellow', 'blue', 'green', 'pink'] as const
const tone = computed(() => tones[props.index % tones.length])
const marker = computed(() => props.conversation.marker?.replace(/^[^\p{L}\p{N}]+/u, ''))
</script>

<template>
  <button class="row" :class="[`row--${tone}`, { 'row--unread': conversation.unread }]" @click="emit('select', conversation.id)">
    <AvatarBadge :user="conversation.user" size="lg" />
    <text class="row__name">{{ conversation.user.name }}</text>
    <view class="row__body">
      <view class="row__line">
        <view class="row__reason">
          <template v-if="conversation.reasonTag"><text class="row__muted">因</text><text class="row__chip"># {{ conversation.reasonTag }}</text><text class="row__muted">而认识</text></template>
          <text v-else class="row__muted">{{ conversation.tagTitle }}</text>
        </view>
        <text class="row__time">{{ conversation.timeLabel }}</text>
      </view>
      <view class="row__line">
        <text class="row__preview">{{ conversation.preview }}</text>
        <text v-if="conversation.unread" class="row__badge">{{ conversation.unread > 99 ? '99+' : conversation.unread }}</text>
        <view v-else-if="marker" class="row__marker">
          <image src="/static/decor/leaf-sprig.png" mode="aspectFit" aria-hidden="true" />
          <text>{{ marker }}</text>
        </view>
      </view>
    </view>
    <text v-if="conversation.unread" class="row__arrow" aria-hidden="true">›</text>
  </button>
</template>

<style scoped lang="scss">
.row { position:relative; display:flex; align-items:center; gap:14rpx; width:100%; min-height:100rpx; margin:0; padding:12rpx 20rpx 12rpx 24rpx; overflow:visible; color:var(--tago-ink); text-align:left; border:0; border-radius:10rpx 14rpx 8rpx 12rpx; box-shadow:0 3rpx 10rpx rgba(58,72,52,.07); line-height:1.3; }
.row::after { border:0; }
.row--yellow { background:#fbf1d4; }
.row--blue { background:#e4eef8; }
.row--green { background:#e5f1e2; }
.row--pink { background:#fbe6e4; }
.row--unread::before { content:''; position:absolute; top:50%; left:8rpx; width:10rpx; height:10rpx; border-radius:50%; background:var(--tago-accent); transform:translateY(-50%); }
.row__name { display:-webkit-box; width:132rpx; flex:none; overflow:hidden; font-size:24rpx; font-weight:850; line-height:1.25; word-break:break-all; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.row__body { display:flex; min-width:0; flex:1; flex-direction:column; gap:8rpx; }
.row__line { display:flex; align-items:center; gap:12rpx; min-width:0; }
.row__reason { display:flex; align-items:center; gap:8rpx; min-width:0; flex:1; overflow:hidden; white-space:nowrap; }
.row__muted { flex:none; color:#4d6a87; font-size:18rpx; }
.row__chip { display:block; min-width:0; flex:0 1 auto; overflow:hidden; white-space:nowrap; padding:3rpx 12rpx; color:var(--tago-ink); border-radius:8rpx; background:rgba(255,255,255,.62); font-size:18rpx; font-weight:700; text-overflow:ellipsis; }
.row__time { flex:none; color:#4d6a87; font-size:18rpx; }
.row__preview { min-width:0; flex:1; overflow:hidden; color:#3d5f86; font-size:18rpx; text-overflow:ellipsis; white-space:nowrap; }
.row__badge { display:grid; flex:none; min-width:30rpx; height:30rpx; padding:0 8rpx; place-items:center; color:#fff; border-radius:999rpx; background:var(--tago-danger); font-size:18rpx; font-weight:800; line-height:1; }
.row__marker { display:flex; align-items:center; gap:6rpx; max-width:210rpx; flex:none; color:#4a5a4c; font-size:18rpx; }
.row__marker image { width:26rpx; height:26rpx; flex:none; }
.row__marker text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.row__arrow { flex:none; margin-left:-4rpx; color:#58606a; font-size:36rpx; line-height:1; }
</style>
