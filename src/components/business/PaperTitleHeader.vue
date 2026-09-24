<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <view class="paper-title">
    <button class="paper-title__back" aria-label="返回" @click="emit('back')" />
    <image class="paper-title__logo" src="/static/illustrations/tago-wordmark.png" mode="aspectFit" aria-label="TAGO" />
    <view class="paper-title__heading">
      <text class="paper-title__title">{{ title }}</text>
      <view class="paper-title__spark" aria-hidden="true"><i /><i /><i /></view>
    </view>
    <text v-if="subtitle" class="paper-title__subtitle">{{ subtitle }}</text>
  </view>
</template>

<style scoped lang="scss">
.paper-title { position:relative; z-index:3; display:flex; align-items:center; flex-direction:column; padding:calc(18px + env(safe-area-inset-top)) 56px 10px; }
.paper-title__back { position:absolute; top:calc(14px + env(safe-area-inset-top)); left:-6px; width:44px; height:44px; padding:0; border:0; background:transparent; }
.paper-title__back::before { content:''; position:absolute; top:15px; left:18px; width:13px; height:13px; border-bottom:3px solid #20584f; border-left:3px solid #20584f; border-radius:2px; transform:rotate(45deg); }
.paper-title__back::after { border:0; }
.paper-title__logo { width:104px; height:34px; }
.paper-title__heading { position:relative; margin-top:6px; }
.paper-title__title {
  position:relative; display:block; padding:0 10px; color:#20584f; font-size:32px; font-weight:900; letter-spacing:4px; line-height:1.25;
  background:linear-gradient(transparent 62%, rgba(244,201,76,.55) 62% 90%, transparent 90%);
}
.paper-title__spark { position:absolute; top:-2px; right:-26px; width:24px; height:30px; }
.paper-title__spark i { position:absolute; left:0; width:16px; height:4px; border-radius:4px; background:#f4c94c; transform-origin:left center; }
.paper-title__spark i:nth-child(1) { top:4px; transform:rotate(-40deg); }
.paper-title__spark i:nth-child(2) { top:14px; transform:rotate(-8deg); }
.paper-title__spark i:nth-child(3) { top:24px; transform:rotate(24deg); }
.paper-title__subtitle { margin-top:4px; color:#2f4a6a; font-size:14px; font-weight:700; letter-spacing:1px; }
</style>
