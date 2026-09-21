<script setup lang="ts">
withDefaults(defineProps<{ active?: 'discover' | 'meet' }>(), { active: 'discover' })
function navigate(path: string) { uni.redirectTo({ url: path }) }
</script>

<template>
  <view class="discover-tabs">
    <button class="discover-tabs__item" :class="{ active: active === 'discover' }" @click="navigate('/pages/discover/index')"><i class="home-icon" /><text>发现</text></button>
    <button class="discover-tabs__create" @click="navigate('/pages/tag/compose')"><i class="plus-icon" /><text>发 Tag</text></button>
    <button class="discover-tabs__item" :class="{ active: active === 'meet' }" @click="navigate('/pages/meet/index')"><i class="people-icon" /><text>相遇</text></button>
  </view>
</template>

<style scoped lang="scss">
.discover-tabs { position:fixed; z-index:20; right:0; bottom:0; left:0; display:grid; grid-template-columns:1fr 1fr 1fr; align-items:start; width:100%; height:calc(132rpx + env(safe-area-inset-bottom)); padding:14rpx 76rpx env(safe-area-inset-bottom); border-radius:38rpx 38rpx 0 0; background:rgba(255,253,247,.97); box-shadow:0 -8rpx 24rpx rgba(33,68,55,.08); }
.discover-tabs button { display:flex; align-items:center; justify-content:flex-start; flex-direction:column; padding:0; color:#7d8492; border:0; border-radius:0; background:transparent; font-family:"LXGW WenKai Screen","PingFang SC",sans-serif; font-size:26rpx; line-height:1.1; }
.discover-tabs button::after { border:0; }
.discover-tabs__item.active { color:var(--tago-primary); font-weight:800; }
.discover-tabs__item i { position:relative; display:block; width:46rpx; height:46rpx; margin:1rpx auto 8rpx; color:currentColor; }
.home-icon { background:currentColor; clip-path:polygon(50% 0,100% 38%,88% 38%,88% 100%,60% 100%,60% 65%,40% 65%,40% 100%,12% 100%,12% 38%,0 38%); }
.people-icon::before,.people-icon::after { content:''; position:absolute; border:4rpx solid currentColor; border-radius:50%; }.people-icon::before { top:0; left:6rpx; width:15rpx; height:15rpx; }.people-icon::after { top:4rpx; right:1rpx; width:12rpx; height:12rpx; }.people-icon { border-radius:0; }.people-icon span { display:none; }.people-icon::marker { display:none; }
.people-icon { background:radial-gradient(circle at 22% 84%, transparent 0 14rpx, currentColor 15rpx 18rpx, transparent 19rpx),radial-gradient(circle at 74% 84%, transparent 0 12rpx, currentColor 13rpx 16rpx, transparent 17rpx); }
.discover-tabs__create { margin-top:-43rpx; color:var(--tago-primary)!important; }
.plus-icon { position:relative; display:block; width:88rpx; height:88rpx; margin-bottom:8rpx; border-radius:50%; background:var(--tago-primary); box-shadow:0 7rpx 18rpx rgba(31,75,63,.22); }
.plus-icon::before,.plus-icon::after { content:''; position:absolute; top:42rpx; left:24rpx; width:40rpx; height:4rpx; border-radius:9rpx; background:white; }.plus-icon::after { transform:rotate(90deg); }
.discover-tabs__create::before { content:''; position:absolute; top:3rpx; left:16rpx; width:7rpx; height:16rpx; border-radius:999rpx; background:var(--tago-accent); transform:rotate(-35deg); box-shadow:12rpx 5rpx 0 -1rpx var(--tago-accent),18rpx 16rpx 0 -2rpx var(--tago-accent); }

@media (max-width:430px) {
  .discover-tabs { height:calc(60px + env(safe-area-inset-bottom)); padding:6px 38px env(safe-area-inset-bottom); border-radius:19px 19px 0 0; }
  .discover-tabs button { font-size:13px; }
  .discover-tabs__item i { width:23px; height:23px; margin-bottom:4px; }
  .discover-tabs__create { margin-top:-22px; }
  .plus-icon { width:44px; height:44px; margin-bottom:4px; }
  .plus-icon::before,.plus-icon::after { top:21px; left:12px; width:20px; height:2px; }
  .discover-tabs__create::before { top:2px; left:8px; width:4px; height:8px; box-shadow:6px 3px 0 -1px var(--tago-accent),9px 8px 0 -2px var(--tago-accent); }
}
</style>
