<script setup lang="ts">
import type { NoteTone } from '@/types/models'

defineProps<{ tone: NoteTone }>()

const uid = `s${Math.random().toString(36).slice(2, 10)}`

const toneMeta: Record<NoteTone, { base: string[]; mid: string; shadow: string }> = {
  yellow: {
    base: ['#fff8d6', '#fae7b3', '#fff2c9'],
    mid: '#f9e7ad',
    shadow: 'rgba(202,167,73,.14)',
  },
  blue: {
    base: ['#e7f4fb', '#d3e9f5', '#e1f0f9'],
    mid: '#d8ebf7',
    shadow: 'rgba(113,151,173,.14)',
  },
  green: {
    base: ['#eef6e8', '#dcebd4', '#e7f3df'],
    mid: '#dcebd4',
    shadow: 'rgba(125,158,116,.14)',
  },
  pink: {
    base: ['#fff1f3', '#f8d5dc', '#fde8ec'],
    mid: '#f7d4dc',
    shadow: 'rgba(196,120,140,.14)',
  },
}
</script>

<template>
  <!-- 包一层普通节点：Safari 会把作为网格子项的 SVG 按 viewBox 比例参与高度计算，reLaunch 后文字会相对纸条下移。 -->
  <view class="paper-strip">
    <svg class="paper-strip__svg" viewBox="0 0 900 156" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter :id="`${uid}-rough`" x="-3%" y="-12%" width="106%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency=".014 .10" numOctaves="2" seed="11" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="B"/>
        </filter>
        <filter :id="`${uid}-grain`">
          <feTurbulence type="fractalNoise" baseFrequency=".48" numOctaves="3" seed="5" result="n"/>
          <feColorMatrix in="n" values=".6 0 0 0 .28 0 .52 0 0 .22 0 0 .26 0 .09 0 0 0 .14 0"/>
          <feBlend in="SourceGraphic" mode="multiply"/>
        </filter>
        <linearGradient :id="`${uid}-grad`" x1="0" y1="0" x2="1" y2=".8">
          <stop :stop-color="toneMeta[tone].base[0]"/>
          <stop offset=".5" :stop-color="toneMeta[tone].base[1]"/>
          <stop offset="1" :stop-color="toneMeta[tone].base[2]"/>
        </linearGradient>
      </defs>
      <path
        class="paper-strip__shadow"
        d="M10 10 C70 5 130 12 188 8 C252 4 316 11 382 7 C456 3 522 12 596 7 C680 3 758 11 890 8 L894 46 C897 81 889 112 893 145 C800 151 731 142 652 148 C561 153 486 144 396 149 C306 153 231 143 152 149 C95 153 50 145 10 148 C6 111 13 82 8 52 Z"
        :fill="toneMeta[tone].shadow"
      />
      <path
        class="paper-strip__body"
        :fill="`url(#${uid}-grad)`"
        fill-opacity=".72"
        :filter="`url(#${uid}-rough)`"
        d="M8 8 C70 3 127 11 185 7 C251 3 314 10 380 6 C455 2 521 12 594 7 C679 2 757 10 892 7 L896 47 C899 83 891 114 895 147 C801 153 732 144 652 150 C560 155 485 145 394 151 C304 155 229 144 149 151 C92 155 48 146 7 149 C4 112 11 84 6 53 Z"
      />
      <path
        class="paper-strip__grain"
        :fill="toneMeta[tone].mid"
        fill-opacity=".22"
        :filter="`url(#${uid}-grain)`"
        d="M8 8 C70 3 127 11 185 7 C251 3 314 10 380 6 C455 2 521 12 594 7 C679 2 757 10 892 7 L896 47 C899 83 891 114 895 147 C801 153 732 144 652 150 C560 155 485 145 394 151 C304 155 229 144 149 151 C92 155 48 146 7 149 C4 112 11 84 6 53 Z"
      />
      <g stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".18">
        <path d="M4 22 L24 20" />
        <path d="M5 31 L26 29" />
        <path d="M874 128 L895 126" />
      </g>
    </svg>
  </view>
</template>

<style scoped lang="scss">
.paper-strip { position: absolute; z-index: 0; inset: 0; overflow: hidden; pointer-events: none; color: var(--tago-ink); }
.paper-strip__svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
</style>
