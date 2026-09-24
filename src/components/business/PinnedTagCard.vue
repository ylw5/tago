<script setup lang="ts">
import type { TagItem } from '@/types/models'
import type { DiscoverExposureTag } from '@/composables/useDiscoverData'
import { useExposureProgress } from '@/composables/useExposureProgress'
import AvatarBadge from './AvatarBadge.vue'
import PinnedPaperBg from '@/components/ui/PinnedPaperBg.vue'
defineProps<{ tag: DiscoverExposureTag }>()
const emit = defineEmits<{ action: [tag: TagItem]; participate: [] }>()
const progress = useExposureProgress()
</script>

<template>
  <view class="pinned" data-testid="pinned-tag-card">
    <PinnedPaperBg />
    <view class="pinned__heading">
      <view class="pinned__label">
        <svg class="pinned__crown" viewBox="0 0 24 24" aria-hidden="true">
          <!-- Icon from Material Symbols Light by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
          <path fill="currentColor" d="M6.327 19q-.212 0-.356-.144t-.144-.357t.144-.356t.356-.143h11.346q.213 0 .356.144t.144.357t-.144.356t-.356.143zm.777-2.884q-.59 0-1.028-.37t-.562-.94L4.32 8.475q-.05.02-.112.022q-.063.003-.113.003q-.471 0-.783-.32T3 7.404q0-.473.313-.804q.312-.33.784-.33t.803.33q.33.331.33.804q0 .104-.008.193t-.059.176l2.76 1.111q.192.077.385.02q.192-.058.326-.231l2.702-3.66q-.217-.142-.344-.376q-.127-.233-.127-.503q0-.472.331-.803q.33-.331.803-.331q.472 0 .804.33t.332.8q0 .284-.127.512q-.127.23-.344.371l2.702 3.66q.134.173.326.23q.193.059.385-.018l2.76-1.112q-.027-.08-.047-.175q-.02-.096-.02-.194q0-.473.312-.804q.312-.33.784-.33t.803.33q.331.331.331.804q0 .454-.332.775t-.806.321q-.038 0-.086-.012t-.106-.013l-1.184 6.33q-.125.572-.562.941t-1.028.37z" />
        </svg>
        当前榜首
      </view>
      <button class="pinned__participate" @click="emit('participate')"><image class="pinned__gavel" src="/static/stickers/gavel.png" mode="aspectFit" aria-hidden="true" /><text class="pinned__participate-label">参与置顶</text></button>
    </view>
    <view class="pinned__identity">
      <AvatarBadge size="lg" :user="tag.author" />
      <text class="pinned__name">{{ tag.author.name }}</text>
      <text class="pinned__title">{{ tag.title }}</text>
    </view>
    <view class="pinned__questions">
      <view v-for="(item,index) in (tag.questions || []).slice(0, 3)" :key="item.id">
        <text class="pinned__q">Q{{ index + 1 }}</text>
        <view class="pinned__qa-copy"><text class="pinned__question">{{ item.question }}</text><text class="pinned__answer">{{ item.answer || tag.summary }}</text></view>
      </view>
    </view>
    <view class="pinned__footer">
      <view class="pinned__coin"><image class="pinned__coin-icon" src="/static/stickers/coin.png" mode="aspectFill" aria-hidden="true" />{{ tag.price ?? '—' }}</view>
      <view v-if="progress(tag) !== null" class="pinned__progress" role="progressbar" aria-label="置顶剩余时间" :aria-valuenow="Math.round(progress(tag)!)" :aria-valuemin="0" :aria-valuemax="100"><view :style="{ width: `${progress(tag)}%` }" /></view>
      <button class="pinned__cta" @click="emit('action', tag)">去看看　→</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pinned { position:relative; display:flex; min-height:364rpx; margin-top:12rpx; margin-bottom:6rpx; padding:60rpx 28rpx 18rpx; flex-direction:column; overflow:visible; background:transparent; }
.pinned::after { content:''; position:absolute; z-index:1; right:24rpx; bottom:18rpx; left:24rpx; height:18rpx; border-radius:50%; background:rgba(184,145,56,.08); filter:blur(8rpx); pointer-events:none; }
.pinned__heading { position:absolute; z-index:3; top:0; right:20rpx; left:20rpx; display:flex; align-items:center; justify-content:space-between; }
.pinned__label { display:flex; align-items:center; gap:9rpx; padding:10rpx 24rpx 11rpx; background:linear-gradient(96deg,#f3c83f,#f8dc79 72%,#f1c23b); clip-path:polygon(2% 8%,98% 0,96% 91%,72% 87%,50% 100%,28% 89%,0 96%); font-size:29rpx; font-weight:700; letter-spacing:1rpx; transform:rotate(-3deg); filter:drop-shadow(0 3rpx 4rpx rgba(116,88,16,.12)); }
.pinned__crown { display:block; flex:none; width:36rpx; height:36rpx; }
.pinned__participate { display:flex; align-items:center; gap:0; height:28px; padding:0 8px; color:#9b4729; background:transparent; transform:rotate(3deg); }
.pinned__participate::after { border:0; }
.pinned__gavel { display:block; width:46px; height:46px; margin-right:-10px; mix-blend-mode:multiply; }
.pinned__participate-label { position:relative; z-index:0; display:block; padding:3px 8px 4px; color:#8e321c; font-size:12px; font-weight:900; letter-spacing:1px; line-height:1; white-space:nowrap; -webkit-text-stroke:.25px currentColor; }
.pinned__participate-label::before { content:''; position:absolute; z-index:-1; inset:1px -3px 0; background:linear-gradient(95deg,#f7df8c,#f4d36e 55%,#f8e39b); clip-path:polygon(1% 14%,8% 7%,15% 11%,28% 2%,42% 8%,53% 0,68% 7%,81% 2%,94% 9%,100% 5%,97% 89%,85% 95%,72% 91%,57% 100%,42% 93%,28% 98%,13% 91%,3% 96%); transform:rotate(-1deg); }
.pinned__identity { position:relative; z-index:2; display:flex; align-items:center; gap:12rpx; min-height:82rpx; }
.pinned__name { color:#242820; font-size:29rpx; font-weight:700; }
.pinned__title { min-width:0; overflow:hidden; padding:7rpx 14rpx; border-radius:22rpx; background:rgba(250,220,112,.8); color:#242820; font-size:27rpx; font-weight:700; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
.pinned__questions { position:relative; z-index:2; display:flex; min-width:0; padding:5rpx 8rpx; flex-direction:column; }
.pinned__questions > view { display:grid; grid-template-columns:44rpx 1fr; gap:4rpx; min-width:0; padding:5rpx 9rpx; border-radius:14rpx; background:rgba(255,255,255,.76); color:#514f46; font-size:17rpx; line-height:1.24; }
.pinned__questions > view + view { margin-top:8rpx; }
.pinned__q { color:#222; font-weight:600; }
.pinned__qa-copy { display:flex; min-width:0; flex-direction:column; gap:3rpx; }
.pinned__qa-copy text { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pinned__question { color:#858a90; font-size:24rpx; font-weight:400; }
.pinned__answer { color:#101d29; font-size:34rpx; font-weight:800; }
.pinned__footer { position:relative; z-index:3; display:flex; align-items:center; gap:14rpx; min-width:0; margin-top:10rpx; }
.pinned__coin { display:flex; align-items:center; gap:7rpx; flex:none; color:#963f22; font-size:46rpx; font-weight:900; }
.pinned__coin-icon { display:block; width:66rpx; height:66rpx; flex:none; }
.pinned__progress { height:26rpx; padding:4rpx; flex:1; border:2rpx solid rgba(101,125,112,.35); border-radius:999rpx; background:rgba(255,255,255,.45); }
.pinned__progress view { height:100%; border-radius:999rpx; background:#387b69; }
.pinned__cta { height:64rpx; padding:0 28rpx; color:white; border-radius:999rpx; background:var(--tago-primary); box-shadow:0 8rpx 18rpx rgba(32,88,79,.13); font-size:24rpx; line-height:64rpx; transition:transform .2s ease,background .2s ease; }
.pinned__cta::after { border:0; }
.pinned__cta:active { background:var(--tago-primary-strong); transform:translateY(1px) scale(.98); }

@media (max-width:480px) {
  .pinned { height:auto; min-height:220px; margin-top:6px; padding:20px 14px 8px; }
  .pinned__heading { right:10px; left:10px; }
  .pinned__label { gap:5px; padding:6px 12px 7px; font-size:16px; }
  .pinned__crown { width:22px; height:22px; }
  .pinned__participate { position:absolute; top:-10px; right:-5px; height:54px; padding:0 5px; }
  .pinned__gavel { width:68px; height:68px; }
  .pinned__participate-label { padding:4px 10px 5px; font-size:16px; font-weight:900; letter-spacing:3px; }
  .pinned__participate-label::before { inset:1px -4px 0; }
  .pinned__identity { gap:8px; min-height:44px; }
  .pinned__identity :deep(.avatar--lg) { width:44px; height:44px; }
  .pinned__name { max-width:72px; overflow:hidden; font-size:14px; text-overflow:ellipsis; white-space:nowrap; }
  .pinned__title { margin-left:3px; padding:6px 10px; font-size:13px; }
  .pinned__questions { margin-top:5px; margin-left:40px; padding:4px 6px; }
  .pinned__questions > view { grid-template-columns:34px minmax(0,1fr); align-items:center; gap:5px; padding:7px 6px; border-radius:12px; font-size:11px; }
  .pinned__questions > view + view { margin-top:5px; }
  .pinned__q { display:grid; width:28px; height:28px; place-items:center; border-radius:50%; background:#ffedaf; font-size:14px; font-weight:800; }
  .pinned__qa-copy { gap:2px; }
  .pinned__question { font-size:12px; line-height:1.15; }
  .pinned__answer { font-size:16px; line-height:1.2; }
  .pinned__footer { gap:8px; margin-top:6px; }
  .pinned__coin { gap:5px; font-size:22px; }
  .pinned__coin-icon { width:32px; height:32px; }
  .pinned__progress { height:17px; padding:2px; border-width:1px; }
  .pinned__cta { height:36px; padding:0 18px; font-size:14px; line-height:36px; }
}
</style>
