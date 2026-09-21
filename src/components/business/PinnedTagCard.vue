<script setup lang="ts">
import type { TagItem } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'
import PinnedPaperBg from '@/components/ui/PinnedPaperBg.vue'
defineProps<{ tag: TagItem }>()
const emit = defineEmits<{ action: [tag: TagItem] }>()
</script>

<template>
  <view class="pinned" data-testid="pinned-tag-card">
    <PinnedPaperBg />
    <view class="pinned__heading">
      <view class="pinned__label"><i class="pinned__crown" />当前榜首</view>
      <button class="pinned__participate" @click="emit('action', tag)"><i class="pinned__gavel" />参与置顶</button>
    </view>
    <view class="pinned__identity">
      <AvatarBadge size="lg" :user="tag.author" />
      <text class="pinned__name">{{ tag.author.name }}</text>
      <text class="pinned__title">{{ tag.title }}</text>
    </view>
    <view class="pinned__questions">
      <view v-for="(item,index) in (tag.questions || []).slice(0, 3)" :key="item.id">
        <text class="pinned__q">Q{{ index + 1 }}</text>
        <view class="pinned__qa-copy">
          <text>{{ item.question }}</text>
          <text>{{ item.answer || tag.summary }}</text>
        </view>
      </view>
    </view>
    <view class="pinned__footer">
      <view class="pinned__coin"><i />{{ tag.price || 200 }}</view>
      <view class="pinned__progress"><view /></view>
      <button class="pinned__cta" @click="emit('action', tag)">去看看</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pinned { position:relative; display:flex; min-height:364rpx; margin-top:12rpx; margin-bottom:6rpx; padding:54rpx 28rpx 22rpx; flex-direction:column; overflow:visible; background:transparent; }
.pinned::after { content:''; position:absolute; z-index:1; right:24rpx; bottom:18rpx; left:24rpx; height:18rpx; border-radius:50%; background:rgba(184,145,56,.08); filter:blur(8rpx); pointer-events:none; }
.pinned__paper { position:absolute; z-index:0; top:-8rpx; right:-8rpx; bottom:-9rpx; left:-8rpx; width:calc(100% + 16rpx); height:calc(100% + 17rpx); pointer-events:none; }
.pinned__heading { position:absolute; z-index:3; top:0; right:20rpx; left:20rpx; display:flex; align-items:center; justify-content:space-between; }
.pinned__label { display:flex; align-items:center; gap:9rpx; padding:10rpx 24rpx 11rpx; background:linear-gradient(96deg,#f3c83f,#f8dc79 72%,#f1c23b); clip-path:polygon(2% 8%,98% 0,96% 91%,72% 87%,50% 100%,28% 89%,0 96%); font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:29rpx; font-weight:700; letter-spacing:1rpx; transform:rotate(-3deg); filter:drop-shadow(0 3rpx 4rpx rgba(116,88,16,.12)); }
.pinned__crown { position:relative; display:inline-block; width:32rpx; height:24rpx; background:#1e2b25; clip-path:polygon(0 25%,22% 55%,38% 0,54% 55%,78% 6%,100% 34%,88% 100%,10% 100%); }
.pinned__participate { display:flex; align-items:center; gap:8rpx; height:56rpx; padding:0 20rpx; color:#9b4729; border-radius:0; background:transparent; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:27rpx; font-weight:700; line-height:56rpx; transform:rotate(4deg); }
.pinned__participate::after { border:0; }
.pinned__gavel { display:block; width:54rpx; height:48rpx; border:0; background:url('/static/split-assets/icons_sprite.webp') -159px -76px / 425px 220px no-repeat; transform:none; }
.pinned__identity { position:relative; z-index:2; display:flex; align-items:center; gap:12rpx; min-height:82rpx; }
.pinned__name { color:#242820; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:29rpx; font-weight:700; }
.pinned__title { max-width:500rpx; overflow:hidden; margin-left:10rpx; padding:10rpx 20rpx; border-radius:22rpx; background:rgba(250,220,112,.8); color:#242820; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:27rpx; font-weight:700; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
.pinned__questions { position:relative; z-index:2; display:flex; min-width:0; margin:0 0 14rpx 108rpx; padding:6rpx 16rpx; flex-direction:column; border-radius:20rpx; background:rgba(255,255,255,.6); box-shadow:inset 0 0 24rpx rgba(255,255,255,.38),0 7rpx 16rpx rgba(94,77,30,.05); }
.pinned__questions > view { display:grid; grid-template-columns:44rpx 1fr; gap:4rpx; min-width:0; padding:5rpx 9rpx; border-bottom:1rpx solid rgba(79,67,32,.13); color:#514f46; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:17rpx; line-height:1.24; }
.pinned__questions > view:last-child { border-bottom:0; }
.pinned__questions > view > text:first-child { color:#222; font-weight:700; }
.pinned__qa-copy { display:flex; min-width:0; flex-direction:column; gap:3rpx; }
.pinned__qa-copy text { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pinned__qa-copy text:first-child { color:#30332e; }
.pinned__qa-copy text:last-child { color:#666255; }
.pinned__footer { position:relative; z-index:3; display:flex; align-items:center; gap:14rpx; min-width:0; margin-left:0; }
.pinned__coin { display:flex; align-items:center; gap:8rpx; min-width:140rpx; color:#913722; font-size:32rpx; font-weight:850; transform:rotate(-3deg); }
.pinned__coin i { display:block; width:48rpx; height:48rpx; border:5rpx solid #b87919; border-radius:50%; background:radial-gradient(circle at 35% 30%,#ffe9a1 0 22%,#e29a24 24% 53%,#fff0ae 56% 65%,#d17b15 68%); }
.pinned__progress { flex:1; height:26rpx; padding:4rpx; border:3rpx solid rgba(82,104,79,.35); border-radius:999rpx; }
.pinned__progress view { width:62%; height:100%; border-radius:999rpx; background:#397c68; }
.pinned__cta { flex:none; height:64rpx; padding:0 28rpx; color:white; border-radius:999rpx; background:var(--tago-primary); box-shadow:0 8rpx 18rpx rgba(32,88,79,.13); font-size:24rpx; line-height:64rpx; transition:transform .2s ease,background .2s ease; }
.pinned__cta::after { border:0; }
.pinned__cta:active { background:var(--tago-primary-strong); transform:translateY(1px) scale(.98); }

@media (max-width:430px) {
  .pinned { height:176px; min-height:176px; margin-top:6px; padding:25px 14px 8px; }
  .pinned__heading { right:10px; left:10px; }
  .pinned__label { gap:4px; padding:5px 11px 6px; font-size:14px; }
  .pinned__crown { width:16px; height:12px; }
  .pinned__participate { gap:3px; height:28px; padding:0 8px; font-size:13px; line-height:28px; }
  .pinned__gavel { width:27px; height:24px; background-position:-80px -38px; background-size:213px 110px; }
  .pinned__identity { gap:6px; min-height:34px; }
  .pinned__name { font-size:14px; }
  .pinned__title { max-width:240px; margin-left:4px; padding:5px 9px; border-radius:14px; font-size:13px; }
  .pinned__questions { margin:0 0 4px 51px; padding:2px 5px; border-radius:10px; }
  .pinned__questions > view { grid-template-columns:20px minmax(0,1fr); gap:2px; padding:2px 4px; font-size:8px; }
  .pinned__qa-copy { gap:1px; }
  .pinned__footer { gap:5px; }
  .pinned__coin { gap:3px; min-width:59px; font-size:17px; }
  .pinned__coin i { width:25px; height:25px; border-width:2px; }
  .pinned__progress { height:13px; padding:2px; border-width:1px; }
  .pinned__cta { height:27px; padding:0 13px; font-size:12px; line-height:27px; }
}
</style>
