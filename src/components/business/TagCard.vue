<script setup lang="ts">
import type { TagItem } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'
import PaperStripBg from '@/components/ui/PaperStripBg.vue'
defineProps<{ tag: TagItem }>()
const emit = defineEmits<{ action: [tag: TagItem] }>()
</script>

<template>
  <view class="tag-card" :class="`tag-card--${tag.tone}`" data-testid="tag-card" @click="emit('action', tag)">
    <PaperStripBg :tone="tag.tone" />
    <AvatarBadge class="tag-card__avatar" size="md" :user="tag.author" />
    <text class="tag-card__name">{{ tag.author.name }}</text>
    <view class="tag-card__body">
      <text class="tag-card__title">{{ tag.title }}</text>
      <text v-if="tag.summary" class="tag-card__summary">{{ tag.summary }}</text>
    </view>
    <button v-if="tag.ctaType !== 'NONE'" class="tag-card__cta" :disabled="tag.ctaType === 'WAITING'" data-testid="tag-action" @click.stop="emit('action', tag)">{{ tag.ctaType === 'WAITING' ? '等待回应' : '去看看' }}</button>
  </view>
</template>

<style scoped lang="scss">
.tag-card { position:relative; display:grid; grid-template-columns:auto 128rpx minmax(0,1fr) auto; align-items:center; column-gap:16rpx; width:100%; min-height:104rpx; margin-bottom:6rpx; padding:10rpx 22rpx 10rpx 34rpx; overflow:visible; background:transparent; transition:transform .2s ease,filter .2s ease; }
.tag-card:active { transform:scale(.988); }
.tag-card::before { content:''; position:absolute; z-index:3; top:17rpx; left:12rpx; width:8rpx; height:8rpx; border-radius:50%; background:#e9bf3e; box-shadow:0 1rpx 0 rgba(255,255,255,.8); }
.tag-card::after { content:''; position:absolute; z-index:3; top:50%; left:4rpx; width:28rpx; height:8rpx; border-radius:999rpx; background:rgba(77,94,83,.18); box-shadow:0 -13rpx 0 rgba(77,94,83,.13),0 13rpx 0 rgba(77,94,83,.13); transform:translateY(-50%) rotate(-8deg); pointer-events:none; }
.tag-card__avatar,.tag-card__name,.tag-card__body,.tag-card__cta { position:relative; z-index:2; }
.tag-card__name,.tag-card__title,.tag-card__summary { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tag-card__name { min-width:0; color:#242820; font-size:26rpx; font-weight:700; line-height:1.2; }
.tag-card__body { display:flex; min-width:0; flex-direction:column; justify-content:center; }
.tag-card__title { color:#242820; font-size:26rpx; font-weight:700; line-height:1.25; letter-spacing:1rpx; }
.tag-card__summary { margin-top:6rpx; color:#62645f; font-size:18rpx; line-height:1.35; letter-spacing:.3rpx; }
.tag-card__cta { flex:none; width:150rpx; height:56rpx; padding:0; color:var(--tago-primary); border:2rpx solid rgba(32,88,79,.55); border-radius:999rpx; background:rgba(255,255,255,.62); box-shadow:0 3rpx 0 rgba(32,88,79,.12); font-size:24rpx; font-weight:700; line-height:52rpx; white-space:nowrap; transition:transform .2s ease,background .2s ease; }
.tag-card__cta::after { border:0; }
.tag-card__cta:active { background:rgba(255,255,255,.9); transform:translateY(1px) scale(.97); }
.tag-card__cta[disabled] { opacity:.55; }

@media (max-width:480px) {
  .tag-card { grid-template-columns:auto 58px minmax(0,1fr) auto; column-gap:8px; min-height:56px; margin-bottom:3px; padding:6px 10px 6px 16px; }
  .tag-card :deep(.avatar--md) { width:40px; height:40px; }
  .tag-card__name { font-size:13px; }
  .tag-card__title { font-size:13px; letter-spacing:0; }
  .tag-card__summary { margin-top:2px; font-size:9px; }
  .tag-card__cta { width:78px; height:30px; border-width:1px; font-size:13px; line-height:28px; }
}

@media (max-width:360px) {
  .tag-card { grid-template-columns:auto 48px minmax(0,1fr) auto; column-gap:6px; }
  .tag-card__cta { width:66px; font-size:12px; }
}
</style>
