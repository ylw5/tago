<script setup lang="ts">
defineProps<{ tag?: string }>()
const emit = defineEmits<{ switch: [] }>()
</script>

<template>
  <view class="bar">
    <view class="bar__paper" />
    <text class="bar__label">我当前的 Tag</text>
    <text class="bar__tag">{{ tag ? `# ${tag.replace(/^#\s*/, '')}` : '# 发布你的第一个 Tag' }}</text>
    <button class="bar__action" aria-label="编辑 Tag" @click="emit('switch')">
      <svg class="bar__pencil" viewBox="0 0 72 88" fill="none" aria-hidden="true">
        <g stroke="#626D76" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 57 44 10Q47 5 52 8L60 13Q65 16 62 22L30 70 10 78Z" fill="#FFD477" />
          <path d="M39 18 44 10Q47 5 52 8L60 13Q65 16 62 22L58 28Z" fill="#D9D9D7" />
          <path d="m12 57 18 13-20 8Z" fill="#F6EEDB" />
        </g>
        <path d="m18 55 24-35 5 3-24 36Z" fill="#FFF1BE" />
        <path d="m52 30 4 3-24 35-4-3Z" fill="#EDB75D" />
        <path d="m11 67 9 7-10 4Z" fill="#626D76" />
        <path d="m47 12 11 7" stroke="#F5F3EE" stroke-width="3" stroke-linecap="round" />
      </svg>
      编辑 Tag
    </button>
  </view>
</template>

<style scoped lang="scss">
.bar { position:relative; display:grid; grid-template-columns:max-content minmax(0,max-content) minmax(max-content,1fr); align-items:center; gap:10rpx; width:calc(100% + 24rpx); min-height:100rpx; margin:0 -12rpx; padding:10rpx 16rpx 10rpx 28rpx; overflow:hidden; }
.bar__paper { position:absolute; inset:10rpx 0; pointer-events:none; border-radius:42rpx 30rpx 38rpx 34rpx; background:linear-gradient(90deg,#e8f3e3 0%,#dcebd5 55%,#e9f1e4 100%); opacity:.9; }
.bar__label { position:relative; z-index:2; display:block; color:#20584f; font-size:30rpx; font-weight:700; letter-spacing:1rpx; white-space:nowrap; }
.bar__tag { position:relative; z-index:2; display:block; width:max-content; max-width:100%; min-width:0; overflow:hidden; padding:12rpx 18rpx; border-radius:42rpx; background:linear-gradient(transparent 5%,rgba(250,220,112,.86) 5%,rgba(250,220,112,.86) 95%,transparent 95%); color:#1c2d27; font-size:28rpx; font-weight:700; letter-spacing:.5rpx; text-overflow:ellipsis; white-space:nowrap; transform:rotate(-.35deg); }
.bar__action { position:relative; z-index:2; justify-self:end; display:flex; flex:none; align-items:center; height:64rpx; margin-left:auto; margin-right:0; padding:0 18rpx; color:var(--tago-primary); border-radius:999rpx; background:rgba(255,255,255,.72); box-shadow:inset 0 0 0 1rpx rgba(255,255,255,.7); font-size:24rpx; font-weight:700; line-height:64rpx; white-space:nowrap; transition:transform .2s ease,background .2s ease; }
.bar__pencil { display:block; flex:none; width:15px; height:18px; margin-right:4px; }
.bar__action::after { border:0; }
.bar__action:active { background:rgba(255,255,255,.94); transform:translateY(1px) scale(.98); }

@media (max-width:480px) {
  .bar { grid-template-columns:max-content minmax(0,max-content) minmax(max-content,1fr); gap:5px; min-height:48px; padding:4px 8px 4px 14px; }
  .bar__paper { inset:3px 0; }
  .bar__label { font-size:15px; }
  .bar__tag { padding:6px 7px; font-size:14px; }
  .bar__action { height:32px; padding:0 11px; font-size:12px; line-height:32px; }
}
</style>
