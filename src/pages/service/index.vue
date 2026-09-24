<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { shallowRef } from 'vue'
import AppHeader from '@/components/business/AppHeader.vue'
import SettingsGroup from '@/components/business/SettingsGroup.vue'
import type { SettingsRow } from '@/components/business/SettingsGroup.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useServiceOverview } from '@/composables/useServiceOverview'
import { goBack } from '@/utils/navigation'

const { loading, error, lastSyncedAt, status, identityRows, contentRows, walletRows, chatRows, load, setBlocked, lookupOperation, acceptPolicy } = useServiceOverview()
const focus = shallowRef('')
const blockUserId = shallowRef('')
const operationName = shallowRef('')
const operationKey = shallowRef('')
const operationResult = shallowRef('')
const working = shallowRef(false)

function openRow(row: SettingsRow) {
  if (row.id === 'profile' || row.id === 'avatars' || row.id === 'session') uni.navigateTo({ url: '/pages/account/index' })
  else if (row.id === 'tag') uni.navigateTo({ url: '/pages/tag/compose' })
  else if (row.id === 'applications') uni.navigateTo({ url: '/pages/applications/index' })
  else if (row.id === 'wallet' || row.id === 'ledger') uni.navigateTo({ url: '/pages/gift/timeline' })
  else if (row.id === 'exposure' || row.id === 'bids' || row.id === 'rules') uni.navigateTo({ url: '/pages/exposure/index' })
  else if (row.id === 'chats' || row.id === 'encounters') uni.navigateTo({ url: '/pages/meet/index' })
  else if (row.id === 'policy') focus.value = 'policy'
  else if (row.id === 'blocks' || row.id === 'operation') focus.value = row.id
}
async function changeBlock(blocked: boolean) {
  working.value = true
  try { await setBlocked(blockUserId.value, blocked); uni.showToast({ title: blocked ? '已屏蔽用户' : '已解除屏蔽', icon: 'none' }) }
  finally { working.value = false }
}
async function inspectOperation() {
  working.value = true
  try {
    const result = await lookupOperation(operationName.value, operationKey.value)
    operationResult.value = [result.operation, result.state, result.providerStarted ? '已开始' : '未开始'].filter(Boolean).join(' · ')
  }
  finally { working.value = false }
}
async function confirmChatPolicy() {
  working.value = true
  try { await acceptPolicy(); uni.showToast({ title: '聊天政策已确认', icon: 'none' }) }
  finally { working.value = false }
}
function openAdmin() { uni.navigateTo({ url: '/pages/admin/index' }) }
onLoad(query => { focus.value = typeof query?.focus === 'string' ? query.focus : '' })
onShow(load)
</script>

<template>
  <view class="tago-page tago-page--detail service-page">
    <AppHeader back title="服务与管理" subtitle="看看此刻哪些服务正在工作" @back="goBack" />
    <AsyncState :loading="loading" :error="error" @retry="load">
      <view class="service-content">
        <view class="service-summary">
          <view><i :class="{ warn: status.session !== '正常' }" /><text>会话{{ status.session }}</text></view>
          <view><i :class="{ warn: status.chat !== '正常' }" /><text>聊天{{ status.chat }}</text></view>
          <view><text>同步 {{ lastSyncedAt || '—' }}</text></view>
        </view>
        <SettingsGroup title="账号与身份" subtitle="登录和公开身份" tone="yellow" :rows="identityRows" @select="openRow" />
        <SettingsGroup title="内容与关系" subtitle="Tag、申请和屏蔽" tone="green" :rows="contentRows" @select="openRow" />

        <section v-if="focus === 'blocks'" class="utility-paper">
          <text class="utility-paper__title">屏蔽管理</text>
          <input v-model="blockUserId" placeholder="输入用户 ID" />
          <view class="utility-actions"><button :disabled="working" @click="changeBlock(true)">屏蔽</button><button :disabled="working" @click="changeBlock(false)">解除屏蔽</button></view>
        </section>
        <section v-if="focus === 'operation'" class="utility-paper">
          <text class="utility-paper__title">查询操作进度</text>
          <input v-model="operationName" placeholder="操作名，例如 create-tag" />
          <input v-model="operationKey" placeholder="幂等键" />
          <button class="utility-primary" :disabled="working" @click="inspectOperation">查询状态</button>
          <text v-if="operationResult" class="operation-result">{{ operationResult }}</text>
        </section>

        <SettingsGroup title="聊天与隐私" subtitle="连接、政策与相遇" tone="green" :rows="chatRows" @select="openRow" />
        <section v-if="focus === 'policy'" class="utility-paper policy-paper">
          <text class="utility-paper__title">聊天政策确认</text>
          <text>确认后，聊天服务会按当前政策版本建立连接。接口返回的接受状态会实时更新到上方。</text>
          <button class="utility-primary" :disabled="working" @click="confirmChatPolicy">阅读并接受当前版本</button>
        </section>
        <SettingsGroup title="钱包与曝光" subtitle="Coin、竞价与规则" tone="blue" :rows="walletRows" @select="openRow" />
        <section class="admin-entry">
          <view><text>管理员工具</text><small>用户、冻结、Coin 调整与批次任务</small></view>
          <button @click="openAdmin">验证身份后进入　›</button>
        </section>
      </view>
    </AsyncState>
  </view>
</template>

<style scoped lang="scss">
.service-page { overflow-x:hidden; }
.service-content { display:flex; flex-direction:column; gap:20rpx; padding-bottom:35rpx; }
.service-summary { display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:8rpx; padding:20rpx; border-radius:20rpx 30rpx 18rpx; background:rgba(220,235,212,.72); box-shadow:var(--tago-shadow); }
.service-summary view { display:flex; align-items:center; justify-content:center; gap:8rpx; min-width:0; color:#4f6057; font-size:17rpx; text-align:center; }
.service-summary i { width:12rpx; height:12rpx; flex:none; border-radius:50%; background:#37a65b; }
.service-summary i.warn { background:#d59d42; }
.utility-paper { padding:24rpx; border-radius:18rpx 27rpx; background:rgba(255,253,247,.9); box-shadow:var(--tago-shadow); }
.utility-paper__title { display:block; margin-bottom:15rpx; font-size:25rpx; font-weight:900; }
.utility-paper input { width:100%; height:70rpx; margin-bottom:12rpx; padding:0 18rpx; border:0; border-radius:15rpx; background:rgba(220,235,226,.42); font-size:21rpx; }
.utility-actions { display:grid; grid-template-columns:1fr 1fr; gap:12rpx; }
.utility-actions button,.utility-primary { height:64rpx; color:var(--tago-primary); border:1rpx solid var(--tago-primary); border-radius:999rpx; background:transparent; font-size:20rpx; line-height:62rpx; }
.utility-actions button::after,.utility-primary::after,.admin-entry button::after { border:0; }
.utility-primary { width:100%; color:#fff; background:var(--tago-primary); }
.operation-result { display:block; margin-top:14rpx; color:var(--tago-primary); font-size:18rpx; text-align:center; }
.policy-paper>text:not(.utility-paper__title) { display:block; margin-bottom:18rpx; color:var(--tago-muted); font-size:19rpx; line-height:1.6; }
.admin-entry { display:flex; align-items:center; justify-content:space-between; gap:18rpx; padding:24rpx; border-radius:18rpx 29rpx; background:rgba(244,215,202,.58); }
.admin-entry>view { display:flex; min-width:0; flex-direction:column; }
.admin-entry text { font-size:24rpx; font-weight:900; }
.admin-entry small { margin-top:5rpx; color:var(--tago-muted); font-size:16rpx; }
.admin-entry button { flex:none; padding:0; color:var(--tago-primary); border:0; background:transparent; font-size:18rpx; }
</style>
