<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { hasAdminAccess } from '@/api/admin'
import { logout } from '@/api/auth'
import { getWalletBalance } from '@/api/wallet'
import { useUserStore } from '@/stores/user'
import AvatarImage from '@/components/ui/AvatarImage.vue'

type MenuId = 'profile' | 'wallet' | 'settings' | 'admin'

interface Props {
  visible: boolean
  displayName: string
  avatarId?: string
  slogan?: string
}

const props = withDefaults(defineProps<Props>(), {
  slogan: '不同的期待\n让生活多一种可能',
})
const emit = defineEmits<{ close: [] }>()

const menus: { id: MenuId; title: string; url: string }[] = [
  { id: 'profile', title: '我的资料', url: '/pages/account/profile' },
  { id: 'wallet', title: '我的钱包', url: '/pages/wallet/index' },
  { id: 'settings', title: '账号设置', url: '/pages/account/index' },
  { id: 'admin', title: '管理员工具', url: '/pages/admin/index' },
]

const coins = shallowRef('—')
const canAdminister = shallowRef(false)
const visibleMenus = computed(() => menus.filter(item => item.id !== 'admin' || canAdminister.value))
const userStore = useUserStore()
let accessCheck = 0

async function loadBalance() {
  coins.value = '—'
  try { coins.value = (await getWalletBalance()).available ?? '—' }
  catch { coins.value = '加载失败' }
}

async function loadAdminAccess() {
  const check = ++accessCheck
  canAdminister.value = false
  const allowed = await hasAdminAccess()
  if (check === accessCheck) canAdminister.value = allowed
}

watch(() => props.visible, (open) => {
  if (!open) return
  loadBalance()
  void loadAdminAccess()
}, { immediate: true })

function go(url: string) {
  emit('close')
  uni.navigateTo({ url })
}

function openMenu(item: { id: MenuId; url: string }) {
  if (item.id === 'settings') {
    uni.showToast({ title: '账号设置即将开放', icon: 'none' })
    return
  }
  go(item.url)
}

function signOut() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmColor: '#20584f',
    success: async ({ confirm }) => {
      if (!confirm) return
      try { await logout() }
      finally {
        userStore.clear()
        emit('close')
        uni.reLaunch({ url: '/pages/auth/login' })
      }
    },
  })
}
</script>

<template>
  <view class="drawer" :class="{ 'drawer--open': visible }" :aria-hidden="!visible">
    <view class="drawer__mask" @click="emit('close')" @touchmove.stop.prevent />
    <view class="drawer__panel" role="dialog" aria-label="个人中心">
      <button class="drawer__close" aria-label="关闭" @click="emit('close')" />

      <view class="drawer__top">
        <view class="drawer__slogan">
          <text>{{ slogan }}</text>
          <text class="drawer__smile">˘ ᴗ ˘</text>
        </view>
        <view class="drawer__badge" @click="go('/pages/account/profile')">
          <view class="drawer__badge-hole" />
          <AvatarImage class="drawer__badge-avatar" :id="avatarId" />
          <text class="drawer__badge-name">{{ displayName }}</text>
        </view>
      </view>

      <view class="drawer__coin" @click="go('/pages/wallet/index')">
        <image src="/static/stickers/coin.png" mode="aspectFit" />
        <text class="drawer__coin-label">金币</text>
        <text class="drawer__coin-value">{{ coins }}</text>
      </view>

      <view class="drawer__menu">
        <view v-for="item in visibleMenus" :key="item.id" class="drawer__item" @click="openMenu(item)">
          <image class="drawer__icon" :src="`/static/icons/menu-${item.id}.png`" mode="aspectFit" />
          <text>{{ item.title }}</text>
          <view class="drawer__chevron" />
        </view>
      </view>

      <view class="drawer__divider" />

      <view class="drawer__item drawer__item--plain" @click="signOut">
        <image class="drawer__icon" src="/static/icons/menu-logout.png" mode="aspectFit" />
        <text>退出登录</text>
        <view class="drawer__chevron" />
      </view>

      <view class="drawer__footer">
        <text class="drawer__footer-note">遇见更多有趣的人\n和正在发生的生活 ♡</text>
        <image class="drawer__cat" src="/static/illustrations/drawer-cat.png" mode="aspectFit" aria-hidden="true" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$paper: #fbf8ef;
$ink: #20584f;

.drawer { position:fixed; z-index:100; inset:0; visibility:hidden; pointer-events:none; transition:visibility 0s linear .28s; }
.drawer--open { visibility:visible; pointer-events:auto; transition-delay:0s; }
.drawer__mask { position:absolute; inset:0; background:rgba(28,36,30,.45); opacity:0; transition:opacity .28s ease; }
.drawer--open .drawer__mask { opacity:1; }

.drawer__panel {
  position:absolute; top:0; right:0; bottom:0;
  display:flex; width:62%; min-width:280px; max-width:420px; flex-direction:column;
  padding:calc(24px + env(safe-area-inset-top)) 16px calc(12px + env(safe-area-inset-bottom));
  overflow:hidden auto; box-sizing:border-box;
  background:$paper; box-shadow:-6px 0 20px rgba(28,36,30,.12);
  transform:translateX(104%); transition:transform .28s cubic-bezier(.2,.8,.2,1);
}
.drawer--open .drawer__panel { transform:translateX(0); }
.drawer__panel::before {
  content:''; position:absolute; top:0; bottom:0; left:-6px; width:7px;
  background:radial-gradient(circle at 0 50%, transparent 3.5px, $paper 4px) 0 0 / 7px 11px repeat-y;
}

.drawer__close { position:absolute; z-index:2; top:calc(14px + env(safe-area-inset-top)); right:12px; width:32px; height:32px; padding:0; border:0; background:transparent; }
.drawer__close::after { border:0; }
.drawer__close::before { content:''; position:absolute; inset:0; background:linear-gradient($ink,$ink) center / 22px 2px no-repeat, linear-gradient($ink,$ink) center / 2px 22px no-repeat; transform:rotate(45deg); }

.drawer__top { position:relative; display:flex; min-height:128px; align-items:flex-start; justify-content:space-between; margin-top:10px; }
.drawer__slogan { display:flex; margin-top:6px; flex-direction:column; color:#7a7f78; font-size:11px; line-height:1.5; white-space:pre-line; transform:rotate(-4deg); }
.drawer__smile { margin:4px 0 0 44px; color:#8b918a; font-size:12px; }

.drawer__badge {
  position:relative; display:flex; width:96px; margin-right:18px; padding:22px 6px 8px; flex-direction:column; align-items:center;
  border:2px solid rgba(103,169,151,.55); border-radius:26px 26px 16px 16px; background:#cfeadf;
  box-shadow:0 4px 12px rgba(32,88,79,.14); transform:rotate(4deg);
}
.drawer__badge-hole { position:absolute; top:6px; width:12px; height:12px; border:3px solid #f2f2ec; border-radius:50%; background:#9bb8ad; }
.drawer__badge-hole::after { content:''; position:absolute; top:1px; left:2px; width:30px; height:3px; border-radius:2px; background:#f08a4b; transform:rotate(-58deg); transform-origin:left center; }
.drawer__badge-avatar { width:54px; height:54px; border:3px solid #fff; border-radius:50%; background:#fff; }
.drawer__badge-name { max-width:84px; margin-top:6px; padding:2px 8px; overflow:hidden; border-radius:8px; background:rgba(255,255,255,.85); color:$ink; font-size:13px; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }

.drawer__coin {
  display:flex; align-items:center; gap:12px; margin:8px 0 18px; padding:12px 16px;
  border-radius:14px 10px 16px 12px; background:#fbe9b4; box-shadow:0 3px 10px rgba(166,122,26,.14);
}
.drawer__coin image { width:52px; height:52px; flex:none; }
.drawer__coin-label { color:$ink; font-size:17px; font-weight:800; letter-spacing:2px; }
.drawer__coin-value { color:$ink; font-size:24px; font-weight:900; }

.drawer__menu { display:flex; flex-direction:column; gap:12px; }
.drawer__item {
  display:flex; min-height:54px; align-items:center; gap:14px; padding:0 14px;
  border-radius:12px 10px 14px 10px; background:#f3efe4; box-shadow:0 2px 6px rgba(39,68,56,.06);
}
.drawer__item:active { background:#ebe5d6; }
.drawer__item > text { flex:1; color:$ink; font-size:16px; font-weight:800; letter-spacing:2px; }
.drawer__item--plain { background:transparent; box-shadow:none; }
.drawer__chevron { width:8px; height:8px; margin-right:4px; border-top:2px solid $ink; border-right:2px solid $ink; transform:rotate(45deg); opacity:.75; }
.drawer__divider { margin:18px 0 6px; border-top:1px dashed rgba(32,88,79,.22); }

.drawer__icon { width:46px; height:46px; flex:none; margin:0 -8px 0 -10px; }

.drawer__footer { position:relative; min-height:150px; margin:auto -16px calc(-12px - env(safe-area-inset-bottom)); padding-top:18px; }
.drawer__footer-note { position:relative; z-index:1; display:block; margin-left:28px; color:#6f756e; font-size:11px; line-height:1.5; white-space:pre-line; transform:rotate(-5deg); }
.drawer__cat { position:absolute; right:-8px; bottom:0; width:92%; height:140px; }
</style>
