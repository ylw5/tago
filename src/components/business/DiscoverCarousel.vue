<script setup lang="ts">
import type { TagItem } from '@/types/models'
import AvatarBadge from './AvatarBadge.vue'

defineProps<{ items: TagItem[] }>()
const emit = defineEmits<{ action: [tag: TagItem] }>()
</script>

<template>
  <view class="carousel" v-if="items.length">
    <scroll-view class="carousel__track" scroll-x :show-scrollbar="false">
      <view class="carousel__card" v-for="tag in items" :key="tag.id" :class="`carousel__card--${tag.tone}`" @click="emit('action', tag)">
        <view class="carousel__top">
          <AvatarBadge size="sm" :user="tag.author" />
          <text class="carousel__name">{{ tag.author.name }}</text>
          <text class="carousel__title">{{ tag.title }}</text>
        </view>
        <text class="carousel__summary">{{ tag.summary }}</text>
        <view class="carousel__bottom">
          <view class="carousel__coin"><i />{{ tag.price || 150 }}</view>
          <view class="carousel__progress"><view /></view>
        </view>
      </view>
    </scroll-view>
    <view class="carousel__dots"><i class="is-active" /><i /><i /></view>
  </view>
</template>

<style scoped lang="scss">
.carousel { position:relative; margin:0 -8rpx; }
.carousel__track { display:flex; width:100%; white-space:nowrap; }
.carousel__card { position:relative; display:inline-flex; width:calc(50% - 7rpx); min-height:154rpx; margin:0 7rpx; padding:14rpx 16rpx 12rpx; flex-direction:column; overflow:hidden; border-radius:16rpx 10rpx 18rpx 11rpx; background:#fff4d7; box-shadow:0 8rpx 18rpx rgba(93,77,30,.08); vertical-align:top; white-space:normal; }
.carousel__card--blue { background:#e4f2fb; }
.carousel__card--green { background:#e7f3df; }
.carousel__card:first-child { transform:rotate(-.5deg); }
.carousel__card:nth-child(2) { transform:rotate(.6deg); }
.carousel__top { display:flex; align-items:center; min-width:0; gap:8rpx; }
.carousel__name { flex:none; color:#242820; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:25rpx; font-weight:700; }
.carousel__title { min-width:0; overflow:hidden; color:#242820; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:24rpx; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
.carousel__summary { display:block; overflow:hidden; margin-top:6rpx; color:#66716d; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:19rpx; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
.carousel__bottom { display:flex; align-items:center; gap:9rpx; margin-top:auto; }
.carousel__coin { display:flex; align-items:center; gap:5rpx; flex:none; color:#9a4327; font-size:28rpx; font-weight:850; }
.carousel__coin i { display:block; width:36rpx; height:36rpx; border:3rpx solid #bf7c1d; border-radius:50%; background:radial-gradient(circle at 35% 30%,#ffe9a1 0 22%,#e29a24 24% 53%,#fff0ae 56% 65%,#d17b15 68%); }
.carousel__progress { flex:1; height:18rpx; padding:3rpx; border-radius:999rpx; background:rgba(117,128,128,.23); }
.carousel__progress view { width:58%; height:100%; border-radius:999rpx; background:#4e8b7d; }
.carousel__dots { display:flex; justify-content:center; gap:14rpx; padding-top:10rpx; }
.carousel__dots i { width:16rpx; height:16rpx; border-radius:50%; background:#c8cdd1; }
.carousel__dots .is-active { background:var(--tago-primary); }

@media (max-width:430px) {
  .carousel__card { height:65px; min-height:0; margin:0 3px; padding:5px 8px 4px; border-radius:9px 6px 10px 6px; }
  .carousel :deep(.avatar--sm) { width:22px; height:22px; border-width:2px; }
  .carousel__name { font-size:12px; }
  .carousel__title { font-size:11px; }
  .carousel__summary { margin-top:3px; font-size:9px; }
  .carousel__coin { gap:2px; font-size:13px; }
  .carousel__coin i { width:19px; height:19px; border-width:2px; }
  .carousel__progress { height:9px; padding:1px; }
  .carousel__dots { gap:7px; padding-top:4px; }
  .carousel__dots i { width:8px; height:8px; }
}
</style>
