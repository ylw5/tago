<script setup lang="ts">
import { computed } from 'vue'

import SettingsIconButton from './SettingsIconButton.vue'

type HeaderVariant = 'default' | 'home' | 'auth'

interface Props {
  title: string
  subtitle: string
  back?: boolean
  compact?: boolean
  settings?: boolean
  variant?: HeaderVariant
  slogan?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  slogan: '不同的期待\n让生活多一种可能',
})
const emit = defineEmits<{ back: []; settings: [] }>()

const isBranded = computed(() => props.variant === 'home' || props.variant === 'auth')
</script>

<template>
  <view class="header" :class="[`header--${variant}`, { 'header--compact': compact }]">
    <button v-if="back" class="header__back" aria-label="返回" @click="emit('back')" />
    <view class="header__copy">
      <view v-if="isBranded" class="header__brand">
        <image class="header__logo" src="/static/illustrations/tago-wordmark.png" mode="aspectFit" aria-label="TAGO" />
        <text v-if="variant === 'home'" class="header__slogan">{{ slogan }}</text>
      </view>
      <text v-else class="header__eyebrow">TAGO</text>
      <text class="header__title">{{ title }}</text>
      <text class="header__subtitle">{{ subtitle }}</text>
    </view>
    <SettingsIconButton v-if="settings" class="header__settings" @click="emit('settings')" />
    <view v-if="isBranded" class="header__cat-art">
      <image class="header__cat" src="/static/illustrations/header-cat.png" mode="aspectFit" aria-hidden="true" />
    </view>
    <image v-else class="header__doodle" src="/static/paper/header-doodles.svg" mode="aspectFit" aria-hidden="true" />
  </view>
</template>

<style scoped lang="scss">
.header {
  position: relative;
  display: flex;
  width: calc(100% + 56rpx);
  min-height: 176rpx;
  margin-left: -28rpx;
  align-items: flex-start;
  overflow: hidden;
  padding: calc(22rpx + env(safe-area-inset-top)) 86rpx 18rpx 84rpx;
  aspect-ratio: 941 / 214;
}
.header--compact { min-height:132rpx; align-items:center; aspect-ratio:auto; }
.header--home {
  min-height:226rpx;
  padding:calc(18rpx + env(safe-area-inset-top)) 28rpx 10rpx;
  aspect-ratio:auto;
}
.header--auth {
  width:calc(100% + 68rpx);
  min-height:320rpx;
  margin-left:-34rpx;
  padding:calc(26rpx + env(safe-area-inset-top)) 62rpx 20rpx;
  aspect-ratio:auto;
}
.header__back {
  position: absolute;
  z-index: 3;
  top: calc(34rpx + env(safe-area-inset-top));
  left: 8rpx;
  width: 76rpx;
  height: 76rpx;
  padding: 0;
  color: var(--tago-ink);
  border: 0;
  background: transparent;
  font-size: 52rpx;
  font-weight: 900;
  line-height: 72rpx;
}
.header--compact .header__back { top: 50%; transform: translateY(-50%); line-height: 76rpx; }
.header__back::before { content: '‹'; }
.header__back::after { border: 0; }
.header__settings { position:absolute; z-index:4; top:calc(30rpx + env(safe-area-inset-top)); right:12rpx; }
.header__copy { position: relative; z-index: 2; display:flex; min-width:0; flex:1; flex-direction:column; justify-content:center; }
.header--home .header__copy { padding-right:218rpx; }
.header--auth .header__copy { padding-right:172rpx; }
.header__brand { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:4rpx; }
.header__logo { display:block; width:180rpx; height:60rpx; flex:none; }
.header__slogan { color:var(--tago-muted); font-size:15rpx; line-height:1.35; text-align:right; white-space:pre-line; transform:rotate(-2deg); }
.header__eyebrow { color: rgba(32,88,79,.58); font-size:17rpx; font-weight:800; letter-spacing:4rpx; transform:rotate(-1.2deg); }
.header__title {
  max-width:620rpx;
  margin-top:7rpx;
  color:var(--tago-ink);
  font-size:40rpx;
  font-weight:900;
  line-height:1.24;
  letter-spacing:1rpx;
}
.header__subtitle { margin-top:8rpx; max-width:600rpx; color:var(--tago-muted); font-size:21rpx; line-height:1.42; }
.header--compact .header__title { font-size:34rpx; line-height:1.25; }
.header--compact .header__subtitle { font-size:19rpx; }
.header--home .header__title { margin-top:8rpx; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; }
.header--home .header__subtitle { margin-top:6rpx; }
.header--auth .header__logo { width:230rpx; height:82rpx; }
.header--auth .header__title { margin-top:22rpx; font-size:52rpx; line-height:1.1; letter-spacing:4rpx; }
.header--auth .header__subtitle { margin-top:20rpx; font-size:27rpx; letter-spacing:2rpx; }
.header__doodle {
  position:absolute;
  top:calc(22rpx + env(safe-area-inset-top));
  right:6rpx;
  z-index:1;
  width:314rpx;
  height:142rpx;
  pointer-events:none;
}
.header__cat-art { position:absolute; right:-48rpx; bottom:-2rpx; z-index:1; width:430rpx; height:215rpx; pointer-events:none; }
.header__cat { display:block; width:100%; height:100%; }
.header--auth .header__cat-art { right:-54rpx; bottom:0; width:360rpx; height:180rpx; opacity:.82; }

@media (max-width: 360px) {
  .header { min-height:168rpx; padding-right:72rpx; }
  .header__title { max-width:520rpx; font-size:37rpx; }
  .header__subtitle { max-width:480rpx; }
  .header__doodle { width:280rpx; height:126rpx; opacity:.86; }
  .header--home { min-height:206rpx; }
  .header--home .header__copy { padding-right:172rpx; }
  .header--home .header__title { font-size:36rpx; }
  .header--home .header__slogan { display:none; }
  .header--home .header__cat-art { right:-54rpx; width:382rpx; height:191rpx; }
}

@media (min-width:361px) and (max-width:430px) {
  .header--home { min-height:204rpx; }
}
</style>
