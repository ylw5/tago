<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, shallowRef } from 'vue'
import type { PublicIdentityDto } from '@/api/account'
import { getProfile, updateProfile } from '@/api/account'
import PaperTitleHeader from '@/components/business/PaperTitleHeader.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { AVATAR_SELECTED_EVENT } from '@/utils/avatar'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import { goBack } from '@/utils/navigation'

type Gender = 'MALE' | 'FEMALE'

const profile = shallowRef<PublicIdentityDto | null>(null)
const avatarId = shallowRef('')
const gender = shallowRef<Gender | null>(null)
const birthday = shallowRef('')
const loading = shallowRef(false)
const saving = shallowRef(false)
const error = shallowRef('')

const today = dayjs().format('YYYY-MM-DD')
const birthdayLabel = computed(() => birthday.value ? dayjs(birthday.value).format('YYYY / MM / DD') : '选择你的生日')
const canSave = computed(() => Boolean(profile.value && avatarId.value && !saving.value))
const genders: { id: Gender; label: string; icon: string }[] = [
  { id: 'MALE', label: '男', icon: '/static/icons/gender-male.png' },
  { id: 'FEMALE', label: '女', icon: '/static/icons/gender-female.png' },
]

function parseGender(value?: string | null): Gender | null {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'MALE' || normalized === '男') return 'MALE'
  if (normalized === 'FEMALE' || normalized === '女') return 'FEMALE'
  return null
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const identity = await getProfile()
    profile.value = identity
    avatarId.value = identity.avatarId
    gender.value = parseGender(identity.gender)
    birthday.value = identity.birthDate || ''
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '资料加载失败' }
  finally { loading.value = false }
}

function onAvatarSelected(id: string) { avatarId.value = id }

function pickAvatar() {
  uni.navigateTo({ url: `/pages/account/avatar?selected=${encodeURIComponent(avatarId.value)}` })
}

function onBirthdayChange(event: { detail: { value: string } }) { birthday.value = event.detail.value }

async function save() {
  if (!canSave.value || !profile.value) return
  saving.value = true
  try {
    const identity = profile.value
    profile.value = await updateProfile({
      displayName: identity.displayName,
      avatarId: avatarId.value,
      expectedVersion: identity.version,
      gender: gender.value,
      birthDate: birthday.value || null,
    })
    uni.showToast({ title: '资料已保存', icon: 'success' })
    setTimeout(() => goBack(), 600)
  }
  catch (cause) { uni.showToast({ title: cause instanceof Error ? cause.message : '保存失败', icon: 'none' }) }
  finally { saving.value = false }
}

onLoad(() => {
  uni.$on(AVATAR_SELECTED_EVENT, onAvatarSelected)
  load()
})
onUnload(() => uni.$off(AVATAR_SELECTED_EVENT, onAvatarSelected))
</script>

<template>
  <view class="profile-page">
    <view class="scenery" aria-hidden="true">
      <image class="scenery__clouds" src="/static/decor/clouds.png" mode="widthFix" />
      <image class="scenery__mountains" src="/static/decor/mountains.png" mode="widthFix" />
      <image class="scenery__leaf scenery__leaf--left" src="/static/decor/leaf-branch.png" mode="widthFix" />
      <image class="scenery__leaf scenery__leaf--right" src="/static/decor/leaf-sprig.png" mode="widthFix" />
      <image class="scenery__wall" src="/static/illustrations/stone-wall.png" mode="widthFix" />
      <image class="scenery__cat" src="/static/illustrations/cat-lying.png" mode="widthFix" />
      <image class="scenery__flowers" src="/static/decor/flower-corners.png" mode="widthFix" />
    </view>

    <PaperTitleHeader title="我的资料" subtitle="完善你的基本信息吧" @back="goBack" />

    <AsyncState :loading="loading" :error="error" @retry="load">
      <view v-if="profile" class="profile-sheet">
        <view class="profile-sheet__avatar" @click="pickAvatar">
          <AvatarImage :id="avatarId" />
          <view class="profile-sheet__edit" aria-label="更换头像">
            <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
          </view>
          <view class="profile-sheet__spark" aria-hidden="true"><i /><i /></view>
        </view>

        <view class="field">
          <text class="field__label">性别</text>
          <view class="gender">
            <view v-for="item in genders" :key="item.id" class="gender__option" :class="{ 'gender__option--active': gender === item.id }" @click="gender = item.id">
              <image :src="item.icon" mode="aspectFit" />
              <text>{{ item.label }}</text>
              <view class="gender__check" />
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field__label">昵称</text>
          <view class="field__body">
            <view class="field__input field__input--readonly">{{ profile.displayName }}</view>
            <text class="field__hint">昵称注册后不可修改</text>
          </view>
        </view>

        <view class="field">
          <text class="field__label">生日</text>
          <view class="field__body">
            <picker mode="date" :value="birthday || '2000-01-01'" start="1940-01-01" :end="today" @change="onBirthdayChange">
              <view class="field__input" :class="{ 'field__input--placeholder': !birthday }">{{ birthdayLabel }}</view>
            </picker>
            <text class="field__hint">生日不会公开</text>
          </view>
        </view>
      </view>
    </AsyncState>

    <view class="profile-actions">
      <button class="profile-actions__save" :disabled="!canSave" @click="save">{{ saving ? '保存中…' : '确认保存' }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
$ink: #20584f;
$navy: #1f3b5c;

.profile-page { position:relative; display:flex; min-height:100vh; flex-direction:column; overflow:hidden; padding:0 16px calc(24px + env(safe-area-inset-bottom)); background:#f5f2ea; }

.scenery { position:absolute; inset:0; pointer-events:none; }
.scenery image { position:absolute; display:block; }
.scenery__clouds { top:0; left:-10%; width:120%; opacity:.9; mix-blend-mode:multiply; }
.scenery__mountains { top:70px; left:-5%; width:110%; opacity:.55; mix-blend-mode:multiply; }
.scenery__leaf--left { top:90px; left:-34px; width:120px; transform:rotate(-12deg); }
.scenery__leaf--right { top:4px; right:-30px; width:110px; transform:rotate(18deg) scaleX(-1); }
.scenery__wall { z-index:3; top:calc(120px + env(safe-area-inset-top)); right:-30px; width:150px; mix-blend-mode:multiply; }
.scenery__cat { z-index:3; top:calc(92px + env(safe-area-inset-top)); right:0; width:112px; }
.scenery__flowers { bottom:0; left:0; width:100%; }

.profile-sheet {
  position:relative; z-index:2; display:flex; margin-top:24px; padding:24px 16px 26px; flex-direction:column; gap:18px;
  border-radius:6px; background:rgba(250,248,242,.96); box-shadow:0 6px 20px rgba(60,70,50,.08);
}
.profile-sheet::before,
.profile-sheet::after { content:''; position:absolute; right:0; left:0; height:8px; background:radial-gradient(circle at 50% 0, transparent 3.5px, rgba(250,248,242,.96) 4px) 0 0 / 10px 8px repeat-x; }
.profile-sheet::before { top:-7px; transform:scaleY(-1); }
.profile-sheet::after { bottom:-7px; }

.profile-sheet__avatar { position:relative; align-self:center; width:150px; height:150px; margin-bottom:10px; padding:5px; border-radius:50%; background:#fff; box-shadow:0 4px 14px rgba(32,88,79,.14); }
.profile-sheet__avatar > .avatar-image { display:block; width:100%; height:100%; border-radius:50%; }
.profile-sheet__edit { position:absolute; right:0; bottom:8px; display:grid; width:42px; height:42px; place-items:center; border:3px solid #fff; border-radius:50%; background:$ink; }
.profile-sheet__edit svg { width:20px; height:20px; }
.profile-sheet__edit path { fill:none; stroke:#fff; stroke-width:2.2; stroke-linejoin:round; stroke-linecap:round; }
.profile-sheet__spark { position:absolute; right:-24px; bottom:44px; width:20px; height:24px; }
.profile-sheet__spark i { position:absolute; left:0; width:14px; height:4px; border-radius:4px; background:#f4c94c; }
.profile-sheet__spark i:nth-child(1) { top:2px; transform:rotate(-30deg); }
.profile-sheet__spark i:nth-child(2) { top:14px; transform:rotate(10deg); }

.field { display:flex; align-items:flex-start; gap:14px; }
.field__label { width:48px; flex:none; padding-top:12px; color:$navy; font-size:17px; font-weight:900; letter-spacing:2px; }
.field__body { display:flex; min-width:0; flex:1; flex-direction:column; }
.field__body picker { width:100%; }
.field__input { display:flex; width:100%; min-width:0; flex:1; height:48px; align-items:center; padding:0 16px; border:1px solid rgba(32,59,92,.08); border-radius:10px; background:#fff; color:$navy; font-size:16px; font-weight:700; letter-spacing:1px; }
.field__input--placeholder { color:#9aa19a; font-weight:500; }
.field__input--readonly { flex:none; background:rgba(255,255,255,.6); }
.field__hint { margin:8px 0 0 6px; color:#7c8599; font-size:12px; }

.gender { display:grid; min-width:0; flex:1; grid-template-columns:1fr 1fr; gap:10px; }
.gender__option { display:flex; height:50px; align-items:center; gap:10px; padding:0 12px 0 16px; border:1.5px solid rgba(32,59,92,.08); border-radius:12px; background:#fff; color:#8d93a0; font-size:16px; font-weight:800; letter-spacing:4px; }
.gender__option image { width:24px; height:24px; flex:none; opacity:.55; filter:grayscale(1); }
.gender__option text { flex:1; }
.gender__check { position:relative; width:20px; height:20px; flex:none; border:1.5px solid #c9cdd2; border-radius:50%; }
.gender__option--active { border-color:$ink; background:#eef7f2; color:$ink; box-shadow:0 2px 8px rgba(32,88,79,.12); }
.gender__option--active image { opacity:1; filter:none; }
.gender__option--active .gender__check { border-color:$ink; background:$ink; }
.gender__option--active .gender__check::after { content:''; position:absolute; top:4px; left:6px; width:5px; height:8px; border-right:2px solid #fff; border-bottom:2px solid #fff; transform:rotate(45deg); }

.profile-actions { position:relative; z-index:2; display:flex; justify-content:center; margin-top:auto; padding-top:36px; padding-bottom:40px; }
.profile-actions__save { width:76%; height:56px; border:0; border-radius:999px; background:linear-gradient(180deg,#1f6a60,#17504a); box-shadow:0 6px 14px rgba(23,80,74,.28); color:#fff; font-size:19px; font-weight:800; letter-spacing:4px; line-height:56px; }
.profile-actions__save::after { border:0; }
.profile-actions__save[disabled] { opacity:.55; }
</style>
