<script setup lang="ts">
defineProps<{ tag?: string }>()
const emit = defineEmits<{ switch: [] }>()
</script>

<template>
  <view class="bar">
    <view class="bar__paper" />
    <text class="bar__label">我当前的 Tag</text>
    <text class="bar__tag">{{ tag ? `# ${tag.replace(/^#\s*/, '')}` : '# 发布你的第一个 Tag' }}</text>
    <button class="bar__action" aria-label="编辑 Tag" @click="emit('switch')"><i class="bar__pencil" />{{ tag ? '编辑 Tag' : '去发布' }}</button>
  </view>
</template>

<style scoped lang="scss">
.bar { position:relative; display:grid; grid-template-columns:max-content minmax(0,1fr) max-content; align-items:center; gap:14rpx; width:calc(100% + 24rpx); min-height:112rpx; margin:0 -12rpx; padding:12rpx 16rpx 12rpx 28rpx; overflow:hidden; }
.bar__paper { position:absolute; inset:10rpx 0; pointer-events:none; border-radius:42rpx 30rpx 38rpx 34rpx; background:linear-gradient(90deg,#e8f3e3 0%,#dcebd5 55%,#e9f1e4 100%); opacity:.9; }
.bar__label { position:relative; z-index:2; display:block; color:#20584f; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:30rpx; font-weight:700; letter-spacing:1rpx; white-space:nowrap; }
.bar__tag { position:relative; z-index:2; display:block; min-width:0; overflow:hidden; padding:12rpx 18rpx; border-radius:42rpx; background:linear-gradient(transparent 5%,rgba(250,220,112,.86) 5%,rgba(250,220,112,.86) 95%,transparent 95%); color:#1c2d27; font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:28rpx; font-weight:700; letter-spacing:.5rpx; text-overflow:ellipsis; white-space:nowrap; transform:rotate(-.35deg); }
.bar__action { position:relative; z-index:2; display:flex; flex:none; align-items:center; gap:8rpx; height:72rpx; padding:0 20rpx; color:var(--tago-primary); border-radius:999rpx; background:rgba(255,255,255,.72); box-shadow:inset 0 0 0 1rpx rgba(255,255,255,.7); font-family:"KaiTi","STKaiti","LXGW WenKai Screen",sans-serif; font-size:25rpx; font-weight:700; line-height:72rpx; white-space:nowrap; transition:transform .2s ease,background .2s ease; }
.bar__pencil { display:block; width:26rpx; height:36rpx; border:5rpx solid #657068; border-radius:4rpx 4rpx 8rpx 8rpx; background:#f0d274; transform:rotate(28deg); }
.bar__action::after { border:0; }
.bar__action:active { background:rgba(255,255,255,.94); transform:translateY(1px) scale(.98); }

@media (max-width:430px) {
  .bar { gap:7px; min-height:36px; padding:4px 8px 4px 14px; }
  .bar__paper { inset:3px 0; }
  .bar__label { font-size:15px; }
  .bar__tag { padding:6px 8px; font-size:14px; }
  .bar__action { gap:4px; height:28px; padding:0 10px; font-size:12px; line-height:28px; }
  .bar__pencil { width:11px; height:15px; border-width:2px; }
}
</style>
