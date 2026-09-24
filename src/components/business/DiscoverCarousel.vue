<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, shallowRef, watch } from 'vue'
import type { TagItem } from '@/types/models'
import type { DiscoverExposureTag } from '@/composables/useDiscoverData'
import { useExposureProgress } from '@/composables/useExposureProgress'
import AvatarBadge from './AvatarBadge.vue'

const props = withDefaults(defineProps<{ items: DiscoverExposureTag[]; index?: number }>(), { index: 0 })
const emit = defineEmits<{ action: [tag: TagItem]; 'update:index': [index: number] }>()

const target = shallowRef('')
let scrolledIndex = props.index

watch(() => props.index, index => {
  if (index === scrolledIndex) return
  scrolledIndex = index
  target.value = ''
  setTimeout(() => { target.value = `carousel-card-${index}` })
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
const progress = useExposureProgress()
</script>

<template>
  <view class="carousel" v-if="items.length">
    <scroll-view class="carousel__track" scroll-x scroll-with-animation :show-scrollbar="false" :scroll-into-view="target" @scroll="onScroll">
      <view v-for="(tag, i) in items" :id="`carousel-card-${i}`" :key="tag.id" class="carousel__card" :class="`carousel__card--${tag.tone}`" @click="emit('action', tag)">
        <AvatarBadge class="carousel__avatar" size="md" :user="tag.author" />
        <view class="carousel__body">
          <view class="carousel__top">
            <text class="carousel__name">{{ tag.author.name }}</text>
            <text class="carousel__title">{{ tag.title }}</text>
          </view>
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
.carousel__card { position:relative; display:inline-grid; grid-template-columns:auto minmax(0,1fr); align-items:center; column-gap:14rpx; width:calc(58% - 14rpx); min-height:150rpx; margin:0 0 0 14rpx; padding:16rpx 18rpx 14rpx; overflow:hidden; border-radius:16rpx 10rpx 18rpx 11rpx; background:#fff4d7; box-shadow:0 8rpx 18rpx rgba(93,77,30,.08); vertical-align:top; white-space:normal; }
.carousel__card:first-child { margin-left:28rpx; }
.carousel__card:last-child { margin-right:28rpx; }
.carousel__card--blue { background:#e4f2fb; }
.carousel__card--green { background:#e7f3df; }
.carousel__card:nth-child(odd) { transform:rotate(-.5deg); }
.carousel__card:nth-child(even) { transform:rotate(.6deg); }
.carousel__body { display:flex; min-width:0; flex-direction:column; gap:6rpx; }
.carousel__top { display:flex; align-items:baseline; min-width:0; gap:12rpx; }
.carousel__name { flex:none; max-width:40%; overflow:hidden; color:#242820; font-size:25rpx; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
.carousel__title { min-width:0; overflow:hidden; color:#242820; font-size:24rpx; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
.carousel__summary { display:block; overflow:hidden; color:#66716d; font-size:19rpx; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
.carousel__bottom { display:flex; align-items:center; gap:9rpx; }
.carousel__coin { display:flex; align-items:center; gap:5rpx; flex:none; color:#9a4327; font-size:28rpx; font-weight:850; }
.carousel__coin-icon { display:block; width:36rpx; height:36rpx; flex:none; }
.carousel__progress { flex:1; height:18rpx; padding:3rpx; border-radius:999rpx; background:rgba(117,128,128,.23); }
.carousel__progress view { height:100%; border-radius:999rpx; background:#4e8b7d; }
.carousel__dots { display:flex; justify-content:center; gap:14rpx; padding-top:10rpx; }
.carousel__dots i { width:16rpx; height:16rpx; border-radius:50%; background:#c8cdd1; transition:background .2s ease; }
.carousel__dots .is-active { background:var(--tago-primary); }

@media (max-width:430px) {
  .carousel { margin:0 -14px; }
  .carousel__card { column-gap:7px; min-height:0; margin-left:7px; padding:8px 9px 7px; border-radius:9px 6px 10px 6px; }
  .carousel__card:first-child { margin-left:14px; }
  .carousel__card:last-child { margin-right:14px; }
  .carousel :deep(.avatar--md) { width:38px; height:38px; }
  .carousel__body { gap:3px; }
  .carousel__top { gap:6px; }
  .carousel__name { font-size:12px; }
  .carousel__title { font-size:12px; }
  .carousel__summary { font-size:9px; }
  .carousel__coin { gap:2px; font-size:14px; }
  .carousel__coin-icon { width:19px; height:19px; clip-path:circle(42% at 50% 50%); }
  .carousel__progress { height:9px; padding:1px; }
  .carousel__dots { gap:7px; padding-top:4px; }
  .carousel__dots i { width:7px; height:7px; }
}
</style>
