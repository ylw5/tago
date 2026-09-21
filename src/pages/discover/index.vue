<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { AppHeader, MyTagBar, PinnedTagCard, TagCard } from '@/components/business'
import DiscoverCarousel from '@/components/business/DiscoverCarousel.vue'
import DiscoverTabBar from '@/components/business/DiscoverTabBar.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useDiscoverData } from '@/composables/useDiscoverData'
import type { TagItem } from '@/types/models'

const { tags, featuredTag, carouselTags, currentTag, displayName, loading, error, load, refresh } = useDiscoverData()

function openComposer() { uni.navigateTo({ url: '/pages/tag/compose' }) }
function openSettings() { uni.navigateTo({ url: '/pages/account/index' }) }
function openTag(tag: TagItem) {
  const path = tag.ctaType === 'APPLY' ? 'respond' : 'compare'
  uni.navigateTo({ url: `/pages/tag/${path}?id=${encodeURIComponent(tag.id)}` })
}

onShow(load)
</script>

<template>
  <view class="tago-page discover-page">
    <AppHeader
      variant="home"
      title="今天想认识怎样的人？"
      subtitle="看看此刻有人留下了什么"
      slogan="每一次相遇\n都可能让生活更有趣"
      @settings="openSettings"
    />
    <view class="discover-profile" aria-label="当前用户">
      <image src="/static/avatars/u0.png" mode="aspectFill" />
      <text>{{ displayName.slice(0, 4) }}</text>
    </view>
    <MyTagBar :tag="currentTag || '还没有发布 Tag'" @switch="openComposer" />
    <PinnedTagCard v-if="featuredTag" :tag="featuredTag" @action="openTag" />
    <view class="discover-section discover-section--carousel">
      <view class="discover-section__head">
        <text class="discover-section__title">轮播置顶</text>
        <text class="discover-section__pager">‹　1 / 3　›</text>
      </view>
      <DiscoverCarousel :items="carouselTags" @action="openTag" />
    </view>
    <view class="discover-section discover-section--recommend">
      <view class="discover-section__head">
        <text class="discover-section__title">也许你会想认识这些 Tag</text>
        <button class="discover-refresh" @click="refresh">↻　换一批</button>
      </view>
      <AsyncState :loading="loading" :error="error" :empty="!tags.length" empty-title="暂时没有推荐" empty-description="稍后刷新，看看有没有新的同频 Tag。" @retry="load">
        <view class="discover-list" :class="{ 'discover-list--loading': loading }"><TagCard v-for="tag in tags" :key="tag.id" :tag="tag" @action="openTag" /></view>
      </AsyncState>
    </view>
    <DiscoverTabBar active="discover" />
  </view>
</template>

<style scoped lang="scss">
.discover-page { display:flex; min-height:100dvh; flex-direction:column; overflow-x:hidden; padding-bottom:calc(144rpx + env(safe-area-inset-bottom)); }
.discover-section { position:relative; }
.discover-section--carousel { margin-top:5rpx; }
.discover-section--recommend { margin-top:12rpx; }
.discover-section__head { display:flex; align-items:center; justify-content:space-between; margin:0 10rpx 8rpx; }
.discover-section__title { position:relative; display:block; color:var(--tago-ink); font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:36rpx; font-weight:800; letter-spacing:1rpx; }
.discover-section__title::after { content:''; display:inline-block; width:10rpx; height:25rpx; margin-left:12rpx; border-radius:999rpx; background:var(--tago-accent); transform:rotate(30deg); box-shadow:14rpx 9rpx 0 -1rpx var(--tago-accent),22rpx 19rpx 0 -3rpx var(--tago-accent); vertical-align:middle; }
.discover-section__pager { color:#20584f; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:26rpx; }
.discover-refresh { height:54rpx; padding:0 22rpx; color:var(--tago-primary); border:0; border-radius:999rpx; background:rgba(255,255,255,.72); box-shadow:0 4rpx 12rpx rgba(32,88,79,.07); font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:24rpx; line-height:54rpx; }
.discover-refresh::after { border:0; }
.discover-list { display:flex; flex-direction:column; transition:opacity .2s ease; }
.discover-list :deep(.tag-card:last-child) { margin-bottom:0; }
.discover-list--loading { opacity:.72; }
.discover-page { position:relative; }
.discover-profile { position:absolute; z-index:6; top:28px; right:10px; display:flex; width:48px; min-height:58px; align-items:center; padding:5px 3px 4px; flex-direction:column; border:2px solid rgba(103,169,151,.45); border-radius:20px 20px 16px 16px; background:#d8f0e6; box-shadow:0 3px 10px rgba(32,88,79,.12); transform:rotate(3deg); }
.discover-profile image { width:31px; height:31px; border:2px solid #fff; border-radius:50%; }
.discover-profile text { max-width:42px; margin-top:2px; overflow:hidden; color:#20584f; font-size:9px; font-weight:700; line-height:1.1; text-align:center; text-overflow:ellipsis; white-space:nowrap; }

@media (max-width:430px) {
  .discover-page { padding-bottom:calc(74px + env(safe-area-inset-bottom)); }
  .discover-section--recommend { margin-top:7px; }
  .discover-section__head { margin:0 5px 4px; }
  .discover-section__title { font-size:18px; }
  .discover-section__title::after { width:5px; height:13px; margin-left:6px; box-shadow:7px 5px 0 -1px var(--tago-accent),11px 10px 0 -2px var(--tago-accent); }
  .discover-section__pager { font-size:12px; }
  .discover-refresh { height:28px; padding:0 11px; font-size:12px; line-height:28px; }
}
</style>
