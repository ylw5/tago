<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { shallowRef } from 'vue'
import type { AvatarDto } from '@/api/account'
import { listAvatars } from '@/api/account'
import PaperTitleHeader from '@/components/business/PaperTitleHeader.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { AVATAR_SELECTED_EVENT } from '@/utils/avatar'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import { goBack } from '@/utils/navigation'

const avatars = shallowRef<AvatarDto[]>([])
const selected = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
const tints = ['#d9ebf6', '#f8ebbd', '#dcebd4']

async function load() {
  loading.value = true
  error.value = ''
  try { avatars.value = await listAvatars() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '头像加载失败' }
  finally { loading.value = false }
}

function confirm() {
  if (!selected.value) return
  uni.$emit(AVATAR_SELECTED_EVENT, selected.value)
  goBack()
}

onLoad((query) => {
  selected.value = typeof query?.selected === 'string' ? decodeURIComponent(query.selected) : ''
  load()
})
</script>

<template>
  <view class="avatar-page">
    <view class="scenery" aria-hidden="true">
      <image class="scenery__clouds" src="/static/decor/clouds.png" mode="widthFix" />
      <image class="scenery__leaf" src="/static/decor/leaf-sprig.png" mode="widthFix" />
      <image class="scenery__bushes" src="/static/decor/bushes.png" mode="widthFix" />
      <image class="scenery__cat" src="/static/illustrations/drawer-cat.png" mode="widthFix" />
      <text class="scenery__note">Nice\nto meet you\nin TAGO ♡</text>
    </view>

    <PaperTitleHeader title="选择头像" subtitle="挑一个喜欢的头像，让大家认识你" @back="goBack" />

    <AsyncState :loading="loading" :error="error" :empty="!avatars.length" empty-title="暂时没有可选头像" @retry="load">
      <view class="avatar-grid">
        <view
          v-for="(avatar, index) in avatars"
          :key="avatar.id"
          class="avatar-grid__item"
          :class="{ 'avatar-grid__item--active': selected === avatar.id }"
          :style="{ background: tints[index % tints.length] }"
          @click="selected = avatar.id"
        >
          <AvatarImage :id="avatar.id" :url="avatar.url" />
          <view v-if="selected === avatar.id" class="avatar-grid__check" />
        </view>
      </view>
    </AsyncState>

    <view class="avatar-actions">
      <button class="avatar-actions__confirm" :disabled="!selected" @click="confirm">确认选择</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
$ink: #20584f;

.avatar-page { position:relative; display:flex; min-height:100vh; flex-direction:column; overflow:hidden; padding:0 18px calc(24px + env(safe-area-inset-bottom)); background:#f5f2ea; }

.scenery { position:absolute; inset:0; pointer-events:none; }
.scenery image { position:absolute; display:block; }
.scenery__clouds { top:10px; left:-10%; width:120%; opacity:.85; mix-blend-mode:multiply; }
.scenery__leaf { top:92px; left:8px; width:76px; transform:rotate(-30deg); }
.scenery__bushes { bottom:0; left:-12%; width:80%; opacity:.8; mix-blend-mode:multiply; }
.scenery__cat { right:-18px; bottom:0; width:62%; }
.scenery__note { position:absolute; bottom:70px; left:40px; color:#5f7f7a; font-size:12px; line-height:1.35; white-space:pre-line; transform:rotate(-6deg); }

.avatar-grid { position:relative; z-index:2; display:grid; margin-top:22px; grid-template-columns:repeat(3,1fr); gap:14px 12px; }
.avatar-grid__item { position:relative; width:100%; aspect-ratio:1; padding:5px; border:4px solid #fff; border-radius:50%; box-shadow:0 3px 10px rgba(60,70,50,.1); transition:transform .15s ease; }
.avatar-grid__item .avatar-image { display:block; width:100%; height:100%; border-radius:50%; }
.avatar-grid__item--active { border-color:#fff; box-shadow:0 0 0 3px $ink, 0 6px 14px rgba(32,88,79,.2); transform:scale(1.03); }
.avatar-grid__check { position:absolute; right:2px; bottom:6px; width:28px; height:28px; border:3px solid #fff; border-radius:50%; background:$ink; }
.avatar-grid__check::after { content:''; position:absolute; top:4px; left:8px; width:6px; height:11px; border-right:2.5px solid #fff; border-bottom:2.5px solid #fff; transform:rotate(45deg); }

.avatar-actions { position:relative; z-index:2; display:flex; justify-content:center; margin-top:auto; padding:32px 0 120px; }
.avatar-actions__confirm { width:76%; height:56px; border:0; border-radius:999px; background:linear-gradient(180deg,#1f6a60,#17504a); box-shadow:0 6px 14px rgba(23,80,74,.28); color:#fff; font-size:19px; font-weight:800; letter-spacing:4px; line-height:56px; }
.avatar-actions__confirm::after { border:0; }
.avatar-actions__confirm[disabled] { opacity:.55; }
</style>
