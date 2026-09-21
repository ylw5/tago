<script setup lang="ts">
import { computed } from 'vue'
import type { TagItem } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'
import PaperStripBg from '@/components/ui/PaperStripBg.vue'
const props = defineProps<{ tag: TagItem }>()
const emit = defineEmits<{ action: [tag: TagItem] }>()
const ctaLabel = computed(() => ({ APPLY:'想认识TA', DETAIL:'看看TA', WAITING:'等待回应', NONE:'' })[props.tag.ctaType])
</script>

<template>
  <view class="tag-card" :class="`tag-card--${tag.tone}`" data-testid="tag-card">
    <PaperStripBg :tone="tag.tone" />
    <view class="tag-card__person">
      <AvatarBadge size="md" :user="tag.author" />
      <view>
        <text class="tag-card__name">{{ tag.author.name }}</text>
        <text class="tag-card__meta">{{ tag.author.city }} · {{ tag.timeLabel }}</text>
      </view>
    </view>
    <view class="tag-card__body">
      <text class="tag-card__title">{{ tag.title }}</text>
      <text class="tag-card__summary">{{ tag.summary }}</text>
      <view class="tag-card__labels"><text v-for="label in tag.labels" :key="label">{{ label }}</text></view>
    </view>
    <view class="tag-card__right">
      <button v-if="tag.ctaType !== 'NONE'" class="tag-card__cta" :class="{ 'tag-card__cta--solid': tag.ctaType === 'APPLY' }" :disabled="tag.ctaType === 'WAITING'" data-testid="tag-action" @click="emit('action', tag)">{{ ctaLabel }}　→</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tag-card { position:relative; display:grid; grid-template-columns:154rpx minmax(0,1fr) 128rpx; align-items:center; column-gap:12rpx; width:100%; min-height:128rpx; margin-bottom:8rpx; padding:18rpx 22rpx 18rpx 28rpx; overflow:visible; background:transparent; transition:transform .2s ease,filter .2s ease; }
.tag-card:active { transform:scale(.988); }
.tag-card::before { content:''; position:absolute; z-index:3; top:17rpx; left:12rpx; width:8rpx; height:8rpx; border-radius:50%; background:#e9bf3e; box-shadow:0 1rpx 0 rgba(255,255,255,.8); }
.tag-card::after { content:''; position:absolute; z-index:3; top:50%; left:4rpx; width:28rpx; height:8rpx; border-radius:999rpx; background:rgba(77,94,83,.18); box-shadow:0 -13rpx 0 rgba(77,94,83,.13),0 13rpx 0 rgba(77,94,83,.13); transform:translateY(-50%) rotate(-8deg); pointer-events:none; }
.tag-card__person { position:relative; z-index:2; display:flex; align-items:center; gap:10rpx; min-width:0; text-align:left; }
.tag-card__person > view { min-width:0; }
.tag-card__name,.tag-card__meta,.tag-card__title,.tag-card__summary { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tag-card__name { font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:clamp(12px,23rpx,19px); font-weight:700; line-height:1.2; }
.tag-card__meta { max-width:100%; margin-top:5rpx; color:#606a63; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:clamp(9px,14rpx,13px); line-height:1.25; letter-spacing:.3rpx; }
.tag-card__body { position:relative; z-index:2; display:flex; min-width:0; flex-direction:column; justify-content:center; padding:0 6rpx; }
.tag-card__title { font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:clamp(14px,26rpx,23px); font-weight:700; line-height:1.22; letter-spacing:1rpx; }
.tag-card__summary { margin-top:7rpx; color:#62645f; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:clamp(10px,15rpx,15px); line-height:1.35; letter-spacing:.3rpx; }
.tag-card__labels { display:flex; gap:9rpx; min-width:0; margin-top:10rpx; overflow:hidden; color:#526159; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:clamp(9px,13rpx,13px); line-height:1.25; white-space:nowrap; }
.tag-card__labels text { flex:none; overflow:hidden; padding:3rpx 8rpx; border-radius:7rpx; background:rgba(255,255,255,.34); text-overflow:ellipsis; white-space:nowrap; }
.tag-card__labels text::before { content:''; display:inline-block; width:6rpx; height:10rpx; margin-right:4rpx; background:#557269; clip-path:polygon(0 0,100% 0,100% 100%,50% 72%,0 100%); }
.tag-card__right { position:relative; z-index:2; display:flex; min-width:0; align-items:center; justify-content:flex-end; }
.tag-card__cta { position:relative; z-index:2; width:118rpx; height:52rpx; padding:0; color:var(--tago-primary); border:2rpx solid rgba(32,88,79,.8); border-radius:999rpx; background:rgba(255,255,255,.34); font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:clamp(10px,17rpx,16px); line-height:48rpx; white-space:nowrap; transition:transform .2s ease,background .2s ease; }
.tag-card__cta--solid { color:white; background:var(--tago-primary); }
.tag-card__cta:active { transform:translateY(1px) scale(.97); }
.tag-card__cta[disabled] { opacity:.55; }

@media (max-width:430px) {
  .tag-card { grid-template-columns:86px minmax(0,1fr) 68px; column-gap:5px; min-height:34px; margin-bottom:2px; padding:4px 9px 4px 12px; }
  .tag-card__body { padding:0; }
  .tag-card__person { gap:5px; }
  .tag-card__meta,.tag-card__labels { display:none; }
  .tag-card__title { font-size:13px; letter-spacing:0; }
  .tag-card__summary { margin-top:2px; font-size:10px; }
  .tag-card__cta { width:66px; height:27px; border-width:1px; font-size:11px; line-height:25px; }
}

@media (max-width:360px) {
  .tag-card { grid-template-columns:92px minmax(0,1fr) 58px; column-gap:5px; }
  .tag-card__labels text:nth-child(n+3) { display:none; }
  .tag-card__cta { width:56px; }
}
</style>
