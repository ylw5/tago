<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { shallowRef, watch } from 'vue'
import { AppHeader, AppTabBar, DiscoverCarousel, ExposureBidSheet, MyTagBar, PinnedTagCard, ProfileDrawer, TagCard } from '@/components/business'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useDiscoverData } from '@/composables/useDiscoverData'
import type { TagItem } from '@/types/models'
import AvatarImage from '@/components/ui/AvatarImage.vue'

const { tags, featuredTag, carouselTags, currentTag, displayName, avatarId, loading, refreshing, error, exposureError, load, refresh } = useDiscoverData()
const carouselIndex = shallowRef(0)
watch(() => carouselTags.value.length, length => { if (carouselIndex.value >= length) carouselIndex.value = 0 })
function stepCarousel(step: number) {
  const length = carouselTags.value.length
  if (length) carouselIndex.value = (carouselIndex.value + step + length) % length
}

function openComposer() { uni.navigateTo({ url: '/pages/tag/compose?edit=1' }) }
async function refreshRecommendations() {
  const refreshed = await refresh()
  if (refreshed && !tags.value.length) uni.showToast({ title: '暂时没有新的推荐', icon: 'none' })
}
const drawerOpen = shallowRef(false)
const bidOpen = shallowRef(false)
function openPinnedTag(tag: TagItem) { uni.navigateTo({ url: `/pages/tag/detail?id=${encodeURIComponent(tag.id)}&pinned=1` }) }
function openTag(tag: TagItem) {
  if (tag.ctaType === 'WAITING' || tag.ctaType === 'NONE') return
  uni.navigateTo({ url: `/pages/tag/detail?id=${encodeURIComponent(tag.id)}` })
}

onLoad((query) => {
  if (query?.resetScroll !== '1') return
  const pin = () => {
    uni.pageScrollTo({ scrollTop: 0, duration: 0 })
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }
  pin()
  requestAnimationFrame(() => {
    pin()
    setTimeout(() => {
      pin()
      if (typeof history !== 'undefined' && 'scrollRestoration' in history) history.scrollRestoration = 'auto'
    }, 50)
  })
})
onShow(load)
</script>

<template>
  <view class="tago-page discover-page">
    <AppHeader
      variant="home"
      title="今天想认识怎样的人？"
      subtitle="看看此刻有人留下了什么"
      slogan="每一次相遇\n都可能让生活更有趣"
    />
    <button class="discover-profile" :aria-label="`${displayName}，打开个人菜单`" @click="drawerOpen = true">
      <image class="discover-profile__charm" src="/static/illustrations/profile-charm.webp" mode="aspectFit" aria-hidden="true" />
      <AvatarImage :id="avatarId" />
      <text>{{ displayName }}</text>
    </button>
    <MyTagBar :tag="currentTag" @switch="openComposer" />
    <PinnedTagCard v-if="featuredTag" :tag="featuredTag" @action="openPinnedTag" @participate="bidOpen = true" />
    <view v-if="!loading && (exposureError || !featuredTag)" class="discover-exposure-empty">
      <text>{{ exposureError ? '置顶内容加载失败，请重试' : '当前榜首暂无，等你来置顶' }}</text>
      <button v-if="exposureError" @click="load">重试</button>
      <button v-else @click="bidOpen = true">参与置顶</button>
    </view>
    <view v-if="carouselTags.length" class="discover-section discover-section--carousel">
      <view class="discover-section__head">
        <text class="discover-section__title">轮播置顶</text>
        <view class="discover-section__pager">
          <button aria-label="上一个" :disabled="carouselTags.length < 2" @click="stepCarousel(-1)">‹</button>
          <text>{{ carouselIndex + 1 }} / {{ carouselTags.length }}</text>
          <button aria-label="下一个" :disabled="carouselTags.length < 2" @click="stepCarousel(1)">›</button>
        </view>
      </view>
      <DiscoverCarousel v-model:index="carouselIndex" :items="carouselTags" @action="openPinnedTag" />
    </view>
    <view class="discover-section discover-section--recommend">
      <view class="discover-section__head">
        <text class="discover-section__title">也许你会想认识这些Tag</text>
        <button class="discover-section__refresh" :class="{ 'is-spinning': refreshing }" :disabled="loading || refreshing" @click="refreshRecommendations"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 0 0-8 8a8 8 0 0 0 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18a6 6 0 0 1-6-6a6 6 0 0 1 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" /></svg>换一批</button>
      </view>
      <AsyncState :loading="loading" :error="error" :empty="!tags.length" empty-title="暂时没有推荐" empty-description="稍后刷新，看看有没有新的同频 Tag。" @retry="load">
        <view class="discover-list" :class="{ 'discover-list--loading': loading || refreshing }"><TagCard v-for="tag in tags" :key="tag.id" :tag="tag" @action="openTag" /></view>
      </AsyncState>
    </view>
    <AppTabBar active="discover" />
    <ProfileDrawer :visible="drawerOpen" :display-name="displayName" :avatar-id="avatarId" @close="drawerOpen = false" />
    <ExposureBidSheet :visible="bidOpen" @close="bidOpen = false" @success="load" />
  </view>
</template>

<style scoped lang="scss">
.discover-page { display:flex; min-height:100dvh; flex-direction:column; overflow-x:hidden; }
.discover-page :deep(.header--home .header__cat-art) { transform:translateX(-24px); }
.discover-profile { position:absolute; z-index:6; top:calc(2px + env(safe-area-inset-top)); right:0; width:80px; height:89px; margin:0; padding:0; overflow:visible; border:0; border-radius:0; background:transparent; line-height:1; transform:rotate(3deg); }
.discover-profile::after { border:0; }
.discover-profile:focus-visible { outline:2px solid #20584f; outline-offset:2px; }
.discover-profile__charm { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.discover-profile > .avatar-image { position:absolute; top:30%; left:24%; width:39%; height:35%; }
.discover-profile > text { position:absolute; top:74%; left:22%; display:block; width:43%; overflow:hidden; color:#20584f; font-size:9px; font-weight:900; line-height:13px; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
.discover-exposure-empty { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:8px 0; padding:16px; border-radius:16px; background:#fff4ce; color:var(--tago-ink); font-size:14px; }
.discover-exposure-empty button { flex:none; margin:0; padding:0 14px; border-radius:999px; background:var(--tago-primary); color:white; font-size:14px; }
.discover-section { position:relative; }
.discover-section--carousel { margin:4px 0 8px; }
.discover-section--recommend { margin-top:10rpx; }
.discover-section__head { display:flex; align-items:center; justify-content:space-between; margin:0 10rpx 8rpx; }
.discover-section__title { position:relative; display:block; color:var(--tago-ink); font-size:36rpx; font-weight:800; letter-spacing:1rpx; }
.discover-section__title::after { content:''; display:inline-block; width:10rpx; height:25rpx; margin-left:12rpx; border-radius:999rpx; background:var(--tago-accent); transform:rotate(30deg); box-shadow:14rpx 9rpx 0 -1rpx var(--tago-accent),22rpx 19rpx 0 -3rpx var(--tago-accent); vertical-align:middle; }
.discover-section__pager { display:flex; align-items:center; gap:6rpx; height:48rpx; padding:0 6rpx; border-radius:999rpx; background:rgba(255,255,255,.78); box-shadow:0 2rpx 8rpx rgba(33,68,55,.08); color:var(--tago-ink); font-size:22rpx; font-weight:700; }
.discover-section__pager button { width:40rpx; height:40rpx; padding:0; color:var(--tago-ink); border:0; background:transparent; font-size:34rpx; font-weight:800; line-height:36rpx; }
.discover-section__pager button::after,.discover-section__refresh::after { border:0; }
.discover-section__pager button[disabled] { opacity:.35; }
.discover-section__refresh { display:flex; align-items:center; gap:8rpx; height:56rpx; margin:0; padding:0 22rpx; color:var(--tago-primary); border:0; border-radius:999rpx; background:rgba(255,255,255,.82); box-shadow:0 2rpx 8rpx rgba(33,68,55,.08); font-size:22rpx; font-weight:700; line-height:56rpx; }
.discover-section__refresh svg { display:block; width:24rpx; height:24rpx; flex:none; }
.discover-section__refresh.is-spinning svg { animation:discover-spin .8s linear infinite; }
.discover-section__refresh[disabled] { opacity:.7; }
@keyframes discover-spin { to { transform:rotate(360deg); } }
.discover-list { display:flex; flex-direction:column; overflow-anchor:none; transition:opacity .2s ease; }
.discover-list :deep(.tag-card:last-child) { margin-bottom:0; }
.discover-list--loading { opacity:.72; }
@media (max-width:360px) {
  .discover-profile { width:72px; height:80px; }
}
@media (max-width:430px) {
  .discover-section--recommend { margin-top:5px; }
  .discover-section__head { margin:0 5px 4px; }
  .discover-section__title { font-size:18px; }
  .discover-section__title::after { width:5px; height:13px; margin-left:6px; box-shadow:7px 5px 0 -1px var(--tago-accent),11px 10px 0 -2px var(--tago-accent); }
  .discover-section--carousel { margin:0 0 4px; }
  .discover-section__pager { gap:2px; height:24px; padding:0 3px; font-size:11px; }
  .discover-section__pager button { width:20px; height:20px; font-size:17px; line-height:18px; }
  .discover-section__refresh { gap:4px; height:28px; padding:0 11px; font-size:12px; line-height:28px; }
  .discover-section__refresh svg { width:12px; height:12px; }
}
</style>
