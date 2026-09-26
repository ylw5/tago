<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, shallowRef } from 'vue'
import type { AvatarDto, PublicIdentityDto } from '@/api/account'
import { changePassword, displayNameIssue, getProfile, listAvatars, normalizeDisplayName, profileUpdateMessage, updateProfile } from '@/api/account'
import { ApiError } from '@/api/client'
import { logout, logoutAll } from '@/api/auth'
import { closeTag, getMyTag } from '@/api/social'
import type { TagMineDto } from '@/api/social'
import { getWalletBalance } from '@/api/wallet'
import type { components } from '@/api/types/generated'
import AppHeader from '@/components/business/AppHeader.vue'
import SettingsGroup from '@/components/business/SettingsGroup.vue'
import type { SettingsRow } from '@/components/business/SettingsGroup.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import { useUserStore } from '@/stores/user'
import { goBack as leavePage } from '@/utils/navigation'

type Wallet = components['schemas']['WalletBalance']
type Panel = 'main' | 'profile' | 'security' | 'tag'

const profile = shallowRef<PublicIdentityDto | null>(null)
const avatars = shallowRef<AvatarDto[]>([])
const wallet = shallowRef<Wallet | null>(null)
const myTags = shallowRef<TagMineDto | null>(null)
const panel = shallowRef<Panel>('main')
const displayName = shallowRef('')
const avatarId = shallowRef('')
const oldPassword = shallowRef('')
const newPassword = shallowRef('')
const loading = shallowRef(false)
const saving = shallowRef(false)
const error = shallowRef('')
const userStore = useUserStore()

const canSave = computed(() => Boolean(profile.value && displayName.value.trim() && avatarId.value))
const selectedAvatar = computed(() => avatars.value.find(item => item.id === avatarId.value))
const headerTitle = computed(() => ({ main: '设置', profile: '个人资料', security: '账号安全', tag: '我的 Tag' })[panel.value])
const headerSubtitle = computed(() => ({ main: '让相遇变得更合心意', profile: '把真实的你留在这里', security: '保护账号与登录会话', tag: '管理正在发生的表达' })[panel.value])

const profileRows = computed<SettingsRow[]>(() => [
  { id: 'profile', symbol: '人', title: '个人资料', description: '昵称、头像与公开身份', value: profile.value ? `@${profile.value.publicId}` : '' },
  { id: 'history', symbol: '时', title: 'Tag 历史', description: '回看已经结束的认真表达' },
  { id: 'tag', symbol: '#', title: '当前 Tag', description: myTags.value?.active?.body || '还没有发布 Tag', value: myTags.value?.active ? '进行中' : '未发布' },
  { id: 'blocks', symbol: '禁', title: '屏蔽管理', description: '按用户 ID 屏蔽或解除屏蔽' },
])
const privacyRows: SettingsRow[] = [
  { id: 'chat', symbol: '聊', title: '聊天与隐私', description: '聊天政策、连接与相遇权限' },
  { id: 'security', symbol: '锁', title: '账号安全', description: '修改密码与管理登录会话' },
]
const walletRows = computed<SettingsRow[]>(() => [
  { id: 'wallet', symbol: '币', title: '钱包与礼物', description: '查看 Coin 余额与不可变流水', value: wallet.value?.available || '0' },
  { id: 'exposure', symbol: '曝', title: '曝光与竞价', description: '管理置顶、轮播与竞价记录' },
])
const serviceRows: SettingsRow[] = [
  { id: 'service', symbol: '⚙', title: '服务状态与管理工具', description: '查看全部接口能力与实时状态' },
  { id: 'admin', symbol: '管', title: '管理员工具', description: '用户、Coin 与礼物档位' },
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [identity, avatarList, balance, tags] = await Promise.all([getProfile(), listAvatars(), getWalletBalance(), getMyTag()])
    profile.value = identity
    avatars.value = avatarList
    wallet.value = balance
    myTags.value = tags
    displayName.value = identity.displayName
    avatarId.value = identity.avatarId
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '账号信息加载失败' }
  finally { loading.value = false }
}

async function saveProfile() {
  if (!canSave.value || !profile.value || saving.value) return
  const issue = displayNameIssue(displayName.value)
  if (issue) return uni.showToast({ title: issue, icon: 'none' })
  saving.value = true
  try {
    const updated = await updateProfile({ displayName: normalizeDisplayName(displayName.value), avatarId: avatarId.value, expectedVersion: profile.value.version })
    profile.value = updated
    displayName.value = updated.displayName
    uni.showToast({ title: '资料已保存', icon: 'success' })
    panel.value = 'main'
  }
  catch (cause) {
    if (cause instanceof ApiError && cause.code === 'PUBLIC_IDENTITY_VERSION_CONFLICT') {
      const typed = displayName.value
      const identity = await getProfile().catch(() => null)
      if (identity) {
        profile.value = identity
        avatarId.value = identity.avatarId
        displayName.value = typed
      }
    }
    uni.showToast({ title: profileUpdateMessage(cause), icon: 'none' })
  }
  finally { saving.value = false }
}

async function savePassword() {
  if (oldPassword.value.length < 8 || newPassword.value.length < 8) return uni.showToast({ title: '密码至少 8 位', icon: 'none' })
  await changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
  userStore.clear()
  uni.reLaunch({ url: '/pages/auth/login' })
}

async function closeActiveTag() {
  const active = myTags.value?.active
  if (!active) return
  await closeTag(active.id)
  await load()
  uni.showToast({ title: 'Tag 已关闭', icon: 'none' })
}

async function signOut(all = false) {
  if (all) await logoutAll()
  else await logout()
  userStore.clear()
  uni.reLaunch({ url: '/pages/auth/login' })
}

function goBack() {
  if (panel.value !== 'main') panel.value = 'main'
  else leavePage()
}

function openProfile() { uni.navigateTo({ url: '/pages/account/profile' }) }

function openRow(row: SettingsRow) {
  if (row.id === 'profile') openProfile()
  else if (row.id === 'security') panel.value = 'security'
  else if (row.id === 'tag') panel.value = 'tag'
  else if (row.id === 'history') uni.navigateTo({ url: '/pages/tag/history' })
  else if (row.id === 'wallet') uni.navigateTo({ url: '/pages/wallet/index' })
  else if (row.id === 'exposure') uni.navigateTo({ url: '/pages/exposure/index' })
  else if (row.id === 'admin') uni.navigateTo({ url: '/pages/admin/index' })
  else if (row.id === 'service' || row.id === 'blocks' || row.id === 'chat') uni.navigateTo({ url: `/pages/service/index?focus=${row.id}` })
}

onLoad((query) => {
  if (query?.panel === 'profile' || query?.panel === 'security' || query?.panel === 'tag') panel.value = query.panel
})
onShow(load)

function openComposer() {
  uni.navigateTo({ url: '/pages/tag/compose' })
}
</script>

<template>
  <view class="tago-page tago-page--detail account-page">
    <AppHeader back :title="headerTitle" :subtitle="headerSubtitle" @back="goBack" />
    <AsyncState :loading="loading" :error="error" @retry="load">
      <view v-if="profile && panel === 'main'" class="settings-content">
        <button class="profile-summary" @click="openProfile">
          <view class="profile-summary__avatar">
            <AvatarImage :id="avatarId" :url="selectedAvatar?.url" />
          </view>
          <view class="profile-summary__copy">
            <text>{{ profile.displayName }}</text>
            <small>TAGO 号：{{ profile.publicId }}</small>
            <small>和有趣的人，聊出更多可能</small>
          </view>
          <text class="profile-summary__arrow">›</text>
        </button>
        <SettingsGroup title="我的资料" subtitle="公开身份与内容" tone="green" :rows="profileRows" @select="openRow" />
        <SettingsGroup title="聊天与隐私" subtitle="相遇后的边界" tone="blue" :rows="privacyRows" @select="openRow" />
        <SettingsGroup title="钱包与互动" subtitle="Coin 与内容曝光" tone="yellow" :rows="walletRows" @select="openRow" />
        <SettingsGroup title="更多服务" tone="green" :rows="serviceRows" @select="openRow" />
        <view class="session-actions">
          <button class="session-actions__current" @click="signOut(false)">退出当前账号</button>
          <button class="session-actions__all" @click="signOut(true)">退出全部设备</button>
        </view>
      </view>

      <view v-else-if="profile && panel === 'profile'" class="editor-paper">
        <view class="editor-paper__title"><text>公开资料</text><small>@{{ profile.publicId }}</small></view>
        <input v-model="displayName" class="paper-input" maxlength="32" placeholder="你的昵称" />
        <scroll-view scroll-x class="avatar-strip">
          <button v-for="avatar in avatars" :key="avatar.id" class="avatar-option" :class="{ 'avatar-option--active': avatarId === avatar.id }" @click="avatarId = avatar.id">
            <AvatarImage :id="avatar.id" :url="avatar.url" />
          </button>
        </scroll-view>
        <button class="primary" :disabled="!canSave || saving" @click="saveProfile">保存资料</button>
      </view>

      <view v-else-if="profile && panel === 'security'" class="editor-paper">
        <view class="editor-paper__title"><text>修改密码</text><small>修改后会退出全部设备</small></view>
        <input v-model="oldPassword" class="paper-input" password placeholder="当前密码" />
        <input v-model="newPassword" class="paper-input" password placeholder="新密码（至少 8 位）" />
        <button class="primary" @click="savePassword">更新密码</button>
      </view>

      <view v-else-if="profile && panel === 'tag'" class="editor-paper tag-panel">
        <text class="tag-panel__state">{{ myTags?.active ? '正在发生' : '暂时没有发布 Tag' }}</text>
        <text v-if="myTags?.active" class="tag-panel__body">{{ myTags.active.body }}</text>
        <button v-if="myTags?.active" class="danger-action" @click="closeActiveTag">关闭这个 Tag</button>
        <button v-else class="primary" @click="openComposer">去发布一个 Tag</button>
      </view>
    </AsyncState>
  </view>
</template>

<style scoped lang="scss">
.account-page { overflow-x:hidden; }
.settings-content { display:flex; flex-direction:column; gap:20rpx; padding-bottom:32rpx; }
.profile-summary { display:grid; grid-template-columns:94rpx minmax(0,1fr) 28rpx; align-items:center; gap:18rpx; width:100%; min-height:150rpx; padding:22rpx 26rpx; color:var(--tago-ink); border:0; border-radius:20rpx 31rpx 19rpx 27rpx; background:linear-gradient(120deg,#fff5cf,#f7e9b9); box-shadow:var(--tago-shadow); text-align:left; transform:rotate(-.25deg); }
.profile-summary::after,.session-actions button::after,.primary::after,.avatar-option::after,.danger-action::after { border:0; }
.profile-summary__avatar { display:grid; place-items:center; width:88rpx; height:88rpx; overflow:hidden; color:#fff; border:5rpx solid rgba(255,255,255,.95); border-radius:50%; background:#7e9c90; font-size:30rpx; }
.profile-summary__avatar .avatar-image { width:100%; height:100%; }
.profile-summary__copy { display:flex; min-width:0; flex-direction:column; }
.profile-summary__copy>text { font-size:28rpx; font-weight:900; }
.profile-summary__copy small { margin-top:5rpx; color:#5f675f; font-size:17rpx; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.profile-summary__arrow { color:var(--tago-primary); font-size:38rpx; }
.session-actions { display:grid; gap:12rpx; margin-top:2rpx; }
.session-actions button { height:70rpx; border:0; border-radius:18rpx; background:rgba(255,253,247,.84); font-size:21rpx; line-height:70rpx; }
.session-actions__current { color:var(--tago-danger); }
.session-actions__all { color:var(--tago-muted); }
.editor-paper { padding:32rpx; border-radius:22rpx 32rpx 20rpx; background:rgba(255,253,247,.92); box-shadow:var(--tago-shadow); }
.editor-paper__title { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:24rpx; }
.editor-paper__title text { font-size:29rpx; font-weight:900; }
.editor-paper__title small { color:var(--tago-muted); font-size:17rpx; }
.paper-input { width:100%; height:78rpx; margin-bottom:16rpx; padding:0 22rpx; border:0; border-radius:18rpx; background:rgba(220,235,226,.42); font-size:24rpx; }
.avatar-strip { width:100%; margin:4rpx 0 24rpx; white-space:nowrap; }
.avatar-option { display:inline-grid; place-items:center; width:78rpx; height:78rpx; margin-right:14rpx; padding:0; overflow:hidden; border:4rpx solid transparent; border-radius:50%; background:var(--tago-primary-weak); }
.avatar-option--active { border-color:var(--tago-accent); }
.avatar-option .avatar-image { width:100%; height:100%; }
.primary,.danger-action { width:100%; height:74rpx; border:0; border-radius:999rpx; font-size:24rpx; line-height:74rpx; }
.primary { color:#fff; background:var(--tago-primary); }
.primary[disabled] { opacity:.5; }
.tag-panel { display:flex; min-height:330rpx; flex-direction:column; justify-content:center; }
.tag-panel__state { color:var(--tago-muted); font-size:20rpx; }
.tag-panel__body { margin:18rpx 0 28rpx; font-size:30rpx; font-weight:900; line-height:1.5; }
.danger-action { color:var(--tago-danger); background:rgba(233,96,82,.08); }
</style>
