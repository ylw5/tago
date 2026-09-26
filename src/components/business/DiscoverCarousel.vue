<script setup lang="ts">
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import type { TagItem } from '@/types/models'
import type { DiscoverExposureTag } from '@/composables/useDiscoverData'
import { useExposureProgress } from '@/composables/useExposureProgress'
import AvatarBadge from './AvatarBadge.vue'

const props = withDefaults(defineProps<{ items: DiscoverExposureTag[]; index?: number }>(), { index: 0 })
const emit = defineEmits<{ action: [tag: TagItem]; 'update:index': [index: number] }>()

const target = shallowRef('')
let scrolledIndex = props.index
let scrollLockTimer: ReturnType<typeof setTimeout> | undefined

function alignToIndex(index: number) {
  clearTimeout(scrollLockTimer)
  scrollLockTimer = setTimeout(() => { scrollLockTimer = undefined }, 450)
  if (typeof document !== 'undefined') {
    const card = document.getElementById(`carousel-card-${index}`)
    const scroller = card?.closest('.uni-scroll-view-scrollbar-hidden') as HTMLElement | null
    if (card && scroller) {
      const last = props.items.length - 1
      const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
      const raw = scroller.scrollLeft + card.getBoundingClientRect().left - scroller.getBoundingClientRect().left
      scroller.scrollTo({ left: index >= last ? max : Math.min(max, Math.max(0, raw)), behavior: 'smooth' })
      return
    }
  }
  target.value = ''
  setTimeout(() => { target.value = `carousel-card-${index}` })
}

watch(() => props.index, index => {
  if (index === scrolledIndex) return
  scrolledIndex = index
  alignToIndex(index)
})

const instance = getCurrentInstance()
let trackWidth = 0
function measureTrack() {
  uni.createSelectorQuery().in(instance?.proxy).select('.carousel__track').boundingClientRect(rect => {
    trackWidth = (rect as UniApp.NodeInfo | null)?.width || 0
  }).exec()
}
onMounted(measureTrack)
watch(() => props.items.length, () => nextTick(measureTrack))

function onScroll(event: { detail: { scrollLeft: number; scrollWidth: number } }) {
  if (scrollLockTimer) return
  const { scrollLeft, scrollWidth } = event.detail
  const last = props.items.length - 1
  const range = scrollWidth - trackWidth
  if (last < 1 || !trackWidth || range <= 0) return
  // 最后一张卡片无法滚到最左侧，滚到底即视为最后一张
  const index = scrollLeft >= range - 2 ? last : Math.min(last, Math.max(0, Math.round(scrollLeft / (scrollWidth / props.items.length))))
  if (index === scrolledIndex) return
  scrolledIndex = index
  emit('update:index', index)
}
const AUTOPLAY_INTERVAL = 5000
let autoplayTimer: ReturnType<typeof setTimeout> | undefined
let touching = false
let pageActive = true
function scheduleAutoplay() {
  clearTimeout(autoplayTimer)
  autoplayTimer = undefined
  if (!pageActive || touching || props.items.length < 2) return
  autoplayTimer = setTimeout(() => emit('update:index', (props.index + 1) % props.items.length), AUTOPLAY_INTERVAL)
}
function onTouchStart() { touching = true; scheduleAutoplay() }
function onTouchEnd() { touching = false; scheduleAutoplay() }
watch([() => props.index, () => props.items.length], scheduleAutoplay, { immediate: true })
onShow(() => { pageActive = true; scheduleAutoplay() })
onHide(() => { pageActive = false; scheduleAutoplay() })
onBeforeUnmount(() => { clearTimeout(autoplayTimer); clearTimeout(scrollLockTimer) })

const progress = useExposureProgress()
function tagLabel(tag: { title: string }) { return tag.title.replace(/^#\s*/, '').trim() }
</script>

<template>
  <view class="carousel" v-if="items.length">
    <scroll-view class="carousel__track" scroll-x scroll-with-animation :show-scrollbar="false" :scroll-into-view="target" @scroll="onScroll" @touchstart="onTouchStart" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
      <view v-for="(tag, i) in items" :id="`carousel-card-${i}`" :key="tag.id" class="carousel__card" :class="`carousel__card--${tag.tone}`" @click="emit('action', tag)">
        <view class="carousel__identity">
          <AvatarBadge class="carousel__avatar" size="md" :user="tag.author" />
          <text class="carousel__name">{{ tag.author.name }}</text>
        </view>
        <view class="carousel__body">
          <text v-if="tagLabel(tag)" class="carousel__title"><text class="carousel__mark"><text class="carousel__hash">#</text>{{ tagLabel(tag) }}</text></text>
          <text class="carousel__summary">{{ tag.summary }}</text>
          <view class="carousel__bottom">
            <view class="carousel__coin"><image class="carousel__coin-icon" src="/static/stickers/coin.png" mode="aspectFill" aria-hidden="true" />{{ tag.price ?? '—' }}</view>
            <view v-if="progress(tag) !== null" class="carousel__progress" role="progressbar" aria-label="置顶剩余时间" :aria-valuenow="Math.round(progress(tag)!)" :aria-valuemin="0" :aria-valuemax="100"><view :style="{ width: `${progress(tag)}%` }" /></view>
          </view>
        </view>
      </view>
    </scroll-view>
    <view v-if="items.length > 1" class="carousel__dots"><i v-for="(tag, i) in items" :key="tag.id" :class="{ 'is-active': i === index }" /></view>
  </view>
</template>

<style scoped lang="scss">
.carousel { position:relative; margin:0 -28rpx; }
.carousel__track { display:flex; width:100%; padding:6rpx 0 4rpx; white-space:nowrap; }
.carousel__card { position:relative; display:inline-grid; grid-template-columns:auto minmax(0,1fr); align-items:start; column-gap:14rpx; width:calc(68% - 14rpx); min-height:150rpx; margin:0 0 0 14rpx; padding:16rpx 18rpx 14rpx; overflow:hidden; border-radius:16rpx 10rpx 18rpx 11rpx; background:#fff4d7; box-shadow:0 8rpx 18rpx rgba(93,77,30,.08); vertical-align:top; white-space:normal; }
.carousel__card:first-child { margin-left:28rpx; }
.carousel__card:last-child { margin-right:28rpx; }
.carousel__card--blue { background:#e4f2fb; }
.carousel__card--green { background:#e7f3df; }
.carousel__card:nth-child(odd) { transform:rotate(-.5deg); }
.carousel__card:nth-child(even) { transform:rotate(.6deg); }
.carousel__identity { display:flex; width:88rpx; flex-direction:column; align-items:center; gap:6rpx; }
.carousel__name { max-width:100%; overflow:hidden; color:var(--tago-ink); font-size:20rpx; font-weight:700; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
.carousel__body { display:flex; min-width:0; flex-direction:column; gap:6rpx; }
.carousel__title { display:-webkit-box; overflow:hidden; color:#1d2622; font-size:30rpx; font-weight:800; line-height:1.3; overflow-wrap:anywhere; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.carousel__mark { background:linear-gradient(transparent 55%,rgba(250,215,95,.7) 55%); -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.carousel__hash { margin-right:4rpx; color:var(--tago-primary); }
.carousel__summary { display:block; overflow:hidden; color:#3a423e; font-size:24rpx; font-weight:600; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
.carousel__bottom { display:flex; align-items:center; gap:9rpx; }
.carousel__coin { display:flex; align-items:center; gap:4rpx; flex:none; max-width:calc(100% - 96rpx); overflow:hidden; color:#9a4327; font-size:24rpx; font-weight:800; }
.carousel__coin-icon { display:block; width:32rpx; height:32rpx; flex:none; }
.carousel__progress { flex:1; min-width:80rpx; height:12rpx; border-radius:999rpx; background:rgba(117,128,128,.16); }
.carousel__progress view { height:100%; border-radius:999rpx; background:rgba(78,139,125,.6); }
.carousel__dots { display:flex; justify-content:center; gap:14rpx; padding-top:10rpx; }
.carousel__dots i { width:16rpx; height:16rpx; border-radius:50%; background:#c8cdd1; transition:background .2s ease; }
.carousel__dots .is-active { background:var(--tago-primary); }

@media (max-width:430px) {
  .carousel { margin:0 -14px; }
  .carousel__card { column-gap:7px; min-height:0; margin-left:7px; padding:8px 9px 7px; border-radius:9px 6px 10px 6px; }
  .carousel__card:first-child { margin-left:14px; }
  .carousel__card:last-child { margin-right:14px; }
  .carousel :deep(.avatar--md) { width:38px; height:38px; }
  .carousel__identity { width:44px; gap:3px; }
  .carousel__name { font-size:10px; }
  .carousel__body { gap:3px; }
  .carousel__title { font-size:15px; }
  .carousel__hash { margin-right:2px; }
  .carousel__summary { font-size:12px; }
  .carousel__coin { gap:2px; max-width:calc(100% - 48px); font-size:12px; }
  .carousel__coin-icon { width:16px; height:16px; clip-path:circle(42% at 50% 50%); }
  .carousel__progress { min-width:40px; height:6px; }
  .carousel__dots { gap:7px; padding-top:4px; }
  .carousel__dots i { width:7px; height:7px; }
}
</style>
