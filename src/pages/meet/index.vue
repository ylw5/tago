<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, shallowRef } from 'vue'
import { AppHeader, AppTabBar, ConversationRow } from '@/components/business'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useApplicationsData } from '@/composables/useApplicationsData'
import { useMeetData } from '@/composables/useMeetData'

const STALE_DAYS = 7

const { applications, outgoing, outgoingError, load: loadApplications } = useApplicationsData()
const outgoingPending = computed(() => outgoing.value.filter(item => item.state === 'PENDING').length)
const incomingHint = computed(() => applications.value.length ? '新的认识申请' : '看看他们的回答')
const outgoingHint = computed(() => {
  if (outgoingError.value) return '暂时没加载出来'
  if (outgoingPending.value) return `${outgoingPending.value} 个等待中`
  if (outgoing.value.length) return '看看现在的状态'
  return '还没有发出'
})
const { conversations, unreadError, loading: chatsLoading, error: chatsError, load: loadChats } = useMeetData()
const staleExpanded = shallowRef(false)
const staleBefore = computed(() => dayjs().subtract(STALE_DAYS, 'day'))
const recentConversations = computed(() => conversations.value.filter(item => !dayjs(item.lastActiveAt).isBefore(staleBefore.value)))
const staleConversations = computed(() => conversations.value.filter(item => dayjs(item.lastActiveAt).isBefore(staleBefore.value)))
// 全部会话都超过 7 天时不折叠，避免列表只剩一个折叠开关
const staleFoldable = computed(() => recentConversations.value.length > 0 && staleConversations.value.length > 0)
const showStale = computed(() => staleExpanded.value || !staleFoldable.value)

function openIncoming() { uni.navigateTo({ url: '/pages/applications/index' }) }
function openOutgoing() { uni.navigateTo({ url: '/pages/applications/outgoing' }) }
function openChat(id: string) { uni.navigateTo({ url: `/pages/chat/index?id=${encodeURIComponent(id)}` }) }

onShow(() => { void loadApplications(); void loadChats() })
</script>

<template>
  <view class="tago-page meet-page">
    <AppHeader variant="home" title="哪些温暖的相遇\n正在继续呢？" subtitle="和有趣的人，聊出更多可能" slogan="每一次对话\n都是生活多一种可能" />
    <view class="application-pair">
      <button class="slip slip--in" @click="openIncoming">
        <view class="slip__tape" aria-hidden="true" />
        <image class="slip__art" src="/static/illustrations/recognition-envelope.png" mode="aspectFit" aria-hidden="true" />
        <view class="slip__copy">
          <view class="slip__title-row">
            <text class="slip__title">想认识你</text>
            <text v-if="applications.length" class="slip__badge">{{ applications.length }}</text>
          </view>
          <text class="slip__hint">{{ incomingHint }}</text>
        </view>
      </button>
      <button class="slip slip--out" @click="openOutgoing">
        <view class="slip__tape" aria-hidden="true" />
        <image class="slip__art" src="/static/illustrations/meet-seedling.png" mode="aspectFit" aria-hidden="true" />
        <view class="slip__copy">
          <text class="slip__title">我发出的</text>
          <text class="slip__hint">{{ outgoingHint }}</text>
        </view>
      </button>
    </view>
    <view class="conversation-heading">
      <image src="/static/illustrations/meet-seedling.png" mode="aspectFit" aria-hidden="true" />
      <text class="tago-section-title">聊天列表</text>
      <view class="conversation-heading__note"><text>好的相遇</text><text>会让平凡的日子发光 ♡</text></view>
    </view>
    <text v-if="unreadError" role="status">未读消息暂未同步：{{ unreadError }}</text>
    <AsyncState :loading="chatsLoading" :error="chatsError" :empty="!conversations.length" empty-title="还没有遇见的人" empty-description="当认识申请被接受后，你们的会话会出现在这里。" @retry="loadChats">
      <template #empty-icon>
        <svg class="empty-chat-icon" viewBox="0 0 96 96" fill="none" aria-hidden="true">
          <circle cx="48" cy="48" r="46" fill="var(--tago-primary-weak)" />
          <path d="M48 42h19a9 9 0 0 1 9 9v11a9 9 0 0 1-9 9h-1v9l-12-9h-6a9 9 0 0 1-9-9V51a9 9 0 0 1 9-9Z" fill="var(--tago-paper)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M28 22h29a10 10 0 0 1 10 10v17a10 10 0 0 1-10 10H43L29 69V59h-1a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10Z" fill="var(--tago-paper)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
          <g fill="currentColor"><circle cx="32" cy="41" r="2.5" /><circle cx="43" cy="41" r="2.5" /><circle cx="54" cy="41" r="2.5" /></g>
        </svg>
      </template>
      <view class="conversation-list">
        <ConversationRow v-for="(conversation, index) in recentConversations" :key="conversation.id" :conversation="conversation" :index="index" @select="openChat" />
        <template v-if="showStale">
          <ConversationRow v-for="(conversation, index) in staleConversations" :key="conversation.id" :conversation="conversation" :index="recentConversations.length + index" @select="openChat" />
        </template>
      </view>
      <button v-if="staleFoldable" class="stale-toggle" :class="{ 'stale-toggle--open': staleExpanded }" @click="staleExpanded = !staleExpanded">
        <text>{{ STALE_DAYS }}天未联系{{ staleExpanded ? '' : ` · 已加载 ${staleConversations.length} 个` }}</text><text class="stale-toggle__chevron">⌄</text>
      </button>
    </AsyncState>
    <AppTabBar active="meet" />
  </view>
</template>

<style scoped lang="scss">
.meet-page { display:flex; min-height:100dvh; flex-direction:column; overflow-x:hidden; }
.empty-chat-icon { width:112rpx; height:112rpx; flex:none; margin-bottom:24rpx; color:var(--tago-primary); }
.application-pair { display:flex; align-items:stretch; gap:16rpx; margin:8rpx 2rpx 16rpx; }
.slip { position:relative; display:flex; min-width:0; flex:1; align-items:center; gap:10rpx; min-height:108rpx; margin:0; padding:14rpx 16rpx 14rpx 14rpx; overflow:visible; color:var(--tago-ink); text-align:left; border:0; border-radius:6rpx 12rpx 8rpx 10rpx; line-height:1.25; }
.slip::after { border:0; }
.slip--in { background:linear-gradient(135deg,#fff6d8,#f8e7b4); box-shadow:0 6rpx 14rpx rgba(120,98,40,.12); transform:rotate(-.4deg); }
.slip--out { background:linear-gradient(135deg,#eef6e4,#dceccf); box-shadow:0 6rpx 14rpx rgba(70,110,60,.1); transform:rotate(.5deg); }
.slip__tape { position:absolute; top:-6rpx; left:18rpx; width:42rpx; height:14rpx; background:rgba(236,205,120,.62); pointer-events:none; transform:rotate(-18deg); }
.slip--out .slip__tape { background:rgba(176,206,150,.72); }
.slip__art { width:64rpx; height:52rpx; flex:none; }
.slip__copy { display:flex; min-width:0; flex:1; flex-direction:column; gap:4rpx; }
.slip__title-row { display:flex; min-width:0; align-items:center; gap:8rpx; }
.slip__title { overflow:hidden; font-size:26rpx; font-weight:850; letter-spacing:1rpx; text-overflow:ellipsis; white-space:nowrap; }
.slip__badge { display:grid; box-sizing:border-box; min-width:32rpx; height:32rpx; padding:0 6rpx; place-items:center; flex:none; color:#fff; border-radius:999rpx; background:var(--tago-danger); font-size:20rpx; font-weight:850; line-height:1; }
.slip__hint { overflow:hidden; color:#4d6458; font-size:18rpx; text-overflow:ellipsis; white-space:nowrap; }
.slip--in .slip__hint { color:#6a5428; }
.conversation-heading { display:flex; align-items:center; min-width:0; margin:4rpx 0 12rpx; }
.conversation-heading > image { width:64rpx; height:48rpx; flex:none; margin-left:-6rpx; }
.conversation-heading .tago-section-title { flex:none; margin:0 0 0 10rpx; }
.conversation-heading__note { display:flex; flex:none; flex-direction:column; align-items:flex-start; margin-left:auto; padding-right:8rpx; color:#3f6a8c; font-size:18rpx; line-height:1.3; transform:rotate(-2deg); }
.conversation-list { display:flex; flex-direction:column; gap:14rpx; }
.stale-toggle { display:flex; align-items:center; gap:10rpx; width:fit-content; margin:16rpx 0 0; padding:6rpx 8rpx; color:var(--tago-primary); border:0; background:transparent; font-size:19rpx; line-height:1.3; }
.stale-toggle::after { border:0; }
.stale-toggle__chevron { font-size:24rpx; line-height:1; transition:transform .2s ease; transform:translateY(-4rpx); }
.stale-toggle--open .stale-toggle__chevron { transform:translateY(4rpx) rotate(180deg); }
</style>
