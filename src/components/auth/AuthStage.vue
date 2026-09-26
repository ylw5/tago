<script setup lang="ts">
import { computed, provide } from 'vue'
import backIcon from '@/static/auth/icon-back.svg'
import wordmark from '@/static/illustrations/tago-wordmark.webp'
import background from '@/static/auth/auth-background.webp'
import { authDebugKey } from './authLayout'

const props = defineProps<{
  image?: string
  debug?: boolean
  active?: 'login' | 'register'
  title?: string
  subtitle?: string
}>()

const emit = defineEmits<{
  back: []
  select: [value: 'login' | 'register']
}>()

provide(authDebugKey, computed(() => !!props.debug))
</script>

<template>
  <view v-if="image" class="mockup-stage">
    <image class="mockup-stage__bg" :src="image" mode="widthFix" />
    <view v-if="debug" class="mockup-stage__grid" />
    <view class="mockup-stage__layer"><slot /></view>
  </view>

  <main v-else class="entry-stage">
    <image class="entry-stage__background" :src="background" mode="scaleToFill" />

    <button class="entry-stage__back" type="button" aria-label="返回" hover-class="entry-stage__back--pressed" @click="emit('back')">
      <image class="entry-stage__back-icon" :src="backIcon" mode="aspectFit" />
    </button>

    <header class="entry-stage__hero">
      <image class="entry-stage__wordmark" :src="wordmark" mode="widthFix" />
      <text class="entry-stage__title">{{ title }}</text>
      <text class="entry-stage__subtitle">{{ subtitle }}</text>
    </header>

    <nav class="entry-stage__tabs" aria-label="账号入口">
      <button
        class="entry-stage__tab"
        :class="{ 'entry-stage__tab--active': active === 'login' }"
        type="button"
        hover-class="entry-stage__tab--pressed"
        @click="emit('select', 'login')"
      >登录</button>
      <button
        class="entry-stage__tab"
        :class="{ 'entry-stage__tab--active': active === 'register' }"
        type="button"
        hover-class="entry-stage__tab--pressed"
        @click="emit('select', 'register')"
      >注册</button>
    </nav>

    <section class="entry-stage__content" :class="active ? `entry-stage__content--${active}` : ''">
      <slot />
    </section>
  </main>
</template>

<style scoped lang="scss">
.mockup-stage { position: relative; width: 100%; }
.mockup-stage__bg { display: block; width: 100%; height: auto; pointer-events: none; }

.mockup-stage__grid {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-image:
    repeating-linear-gradient(to right, rgba(255, 60, 60, .5) 0 1rpx, transparent 1rpx 10%),
    repeating-linear-gradient(to bottom, rgba(60, 120, 255, .5) 0 1rpx, transparent 1rpx 5%);
  pointer-events: none;
}

.mockup-stage__layer { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }

.entry-stage {
  position: relative;
  width: 100%;
  max-width: 560px;
  min-height: 100dvh;
  aspect-ratio: 941 / 1672;
  margin: 0 auto;
  overflow: hidden;
  color: #0b4f57;
  background: #f8f4e9;
}

.entry-stage__background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.entry-stage__back {
  position: absolute;
  z-index: 3;
  top: calc(28rpx + env(safe-area-inset-top));
  left: 42rpx;
  width: 70rpx;
  height: 70rpx;
  padding: 10rpx;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transition: transform .18s ease, background-color .18s ease;
}

.entry-stage__back::after, .entry-stage__tab::after { border: 0; }
.entry-stage__back-icon { width: 100%; height: 100%; }
.entry-stage__back--pressed { background: rgba(32, 88, 79, .08); transform: scale(.94); }

.entry-stage__hero {
  position: absolute;
  z-index: 2;
  top: calc(66rpx + env(safe-area-inset-top));
  left: 18%;
  width: 64%;
  text-align: center;
}

.entry-stage__wordmark { display: block; width: 72%; margin: 0 auto 10rpx; }
.entry-stage__title, .entry-stage__subtitle { display: block; font-weight: 800; letter-spacing: 4rpx; }
.entry-stage__title { font-size: 37rpx; line-height: 1.35; }
.entry-stage__subtitle { margin-top: 4rpx; font-size: 30rpx; line-height: 1.35; }

.entry-stage__tabs {
  position: absolute;
  z-index: 3;
  top: 38.4%;
  left: 9.6%;
  display: grid;
  width: 80.8%;
  height: 78rpx;
  grid-template-columns: 1fr 1fr;
  padding: 0;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(223, 234, 224, .88);
  box-shadow: inset 0 0 14rpx rgba(72, 103, 81, .06);
}

.entry-stage__tab {
  height: 78rpx;
  margin: 0;
  padding: 0;
  color: #0b4f57;
  border: 0;
  border-radius: 999rpx;
  background: transparent;
  font-family: inherit;
  font-size: 31rpx;
  font-weight: 800;
  line-height: 78rpx;
  transition: color .2s ease, background-color .2s ease, transform .2s ease;
}

.entry-stage__tab--active { color: #fffdf7; background: rgba(18, 91, 79, .96); }
.entry-stage__tab--pressed { transform: scale(.98); }

.entry-stage__content {
  position: absolute;
  z-index: 2;
  top: 45.7%;
  left: 9.6%;
  width: 80.8%;
}

@media (min-width: 700px) {
  .entry-stage {
    min-height: 996px;
    margin: 22px auto;
    border: 1px solid rgba(255, 255, 255, .72);
    border-radius: 24px;
    box-shadow: 0 28px 72px rgba(57, 46, 26, .2);
  }
}
</style>
