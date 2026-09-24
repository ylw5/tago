<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import type { components } from '@/api/types/generated'
import {
  createAdjustment, createAdjustmentBatch, findAdminUser, freezeUser, getAdjustment,
  getAdjustmentBatch, listAdjustmentBatchItems, reauthenticate, retryAdjustmentBatch, unfreezeUser,
} from '@/api/admin'
import AppHeader from '@/components/business/AppHeader.vue'
import { goBack } from '@/utils/navigation'

type AdjustmentInput = components['schemas']['AdjustmentInput']
type BatchInput = components['schemas']['BatchInput']

const password = shallowRef('')
const verified = shallowRef(false)
const working = shallowRef(false)
const error = shallowRef('')
const result = shallowRef('')
const lookupEmail = shallowRef('')
const targetUserId = shallowRef('')
const adjustmentId = shallowRef('')
const batchId = shallowRef('')
const retryItemIds = shallowRef('')
const batchJson = shallowRef('[\n  {\n    "email": "",\n    "amount": "10",\n    "direction": "CREDIT",\n    "reasonCode": "MANUAL",\n    "reason": ""\n  }\n]')
const adjustment = reactive<AdjustmentInput>({ email: '', amount: '10', direction: 'CREDIT', reasonCode: 'MANUAL', reason: '' })

function summarize(value: unknown) {
  result.value = JSON.stringify(value, null, 2)
}
async function run(task: () => Promise<unknown>) {
  working.value = true
  error.value = ''
  try { const value = await task(); summarize(value); return value }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '管理员操作失败'; throw cause }
  finally { working.value = false }
}
async function verify() {
  const value = await run(() => reauthenticate({ password: password.value })) as components['schemas']['ReauthenticationView']
  verified.value = Boolean(value.authenticated)
}
async function lookupUser() { await run(() => findAdminUser(lookupEmail.value.trim())) }
async function setFrozen(frozen: boolean) {
  await run(() => frozen ? freezeUser(targetUserId.value.trim()) : unfreezeUser(targetUserId.value.trim()))
  uni.showToast({ title: frozen ? '用户已冻结' : '用户已解冻', icon: 'none' })
}
async function submitAdjustment() {
  const value = await run(() => createAdjustment({ ...adjustment })) as components['schemas']['AdjustmentView']
  adjustmentId.value = value.adjustmentId || adjustmentId.value
}
async function inspectAdjustment() { await run(() => getAdjustment(adjustmentId.value.trim())) }
async function submitBatch() {
  const parsed = JSON.parse(batchJson.value) as AdjustmentInput[]
  const body: BatchInput = { items: parsed }
  const value = await run(() => createAdjustmentBatch(body)) as components['schemas']['BatchView']
  batchId.value = value.batchId || batchId.value
}
async function inspectBatch(items = false) {
  await run(() => items ? listAdjustmentBatchItems(batchId.value.trim()) : getAdjustmentBatch(batchId.value.trim()))
}
async function retryBatch() {
  const itemIds = retryItemIds.value.split(',').map(item => item.trim()).filter(Boolean)
  await run(() => retryAdjustmentBatch(batchId.value.trim(), { itemIds }))
}
</script>

<template>
  <view class="tago-page tago-page--detail admin-page">
    <AppHeader back title="管理员工具" subtitle="高权限操作会再次验证身份" @back="goBack" />
    <view class="admin-content">
      <section class="admin-paper admin-paper--yellow">
        <view class="section-heading"><text>重新验证</text><small>{{ verified ? '本次操作已验证' : '输入当前密码后继续' }}</small></view>
        <input v-model="password" password placeholder="管理员密码" />
        <button class="primary" :disabled="working || password.length < 8" @click="verify">验证管理员身份</button>
      </section>

      <template v-if="verified">
        <section class="admin-paper admin-paper--green">
          <view class="section-heading"><text>用户查询与冻结</text><small>查询公开身份，按用户 ID 执行状态变更</small></view>
          <input v-model="lookupEmail" type="text" placeholder="用户邮箱" />
          <button class="secondary" :disabled="working" @click="lookupUser">查询用户</button>
          <input v-model="targetUserId" type="text" placeholder="用户 ID" />
          <view class="button-row"><button class="danger" :disabled="working" @click="setFrozen(true)">冻结用户</button><button class="secondary" :disabled="working" @click="setFrozen(false)">解除冻结</button></view>
        </section>

        <section class="admin-paper admin-paper--blue">
          <view class="section-heading"><text>单笔 Coin 调整</text><small>每次提交自动携带幂等键</small></view>
          <input v-model="adjustment.email" type="text" placeholder="用户邮箱" />
          <view class="input-pair"><input v-model="adjustment.amount" type="digit" placeholder="数量" /><picker :range="['CREDIT','DEBIT']" @change="adjustment.direction = ['CREDIT','DEBIT'][$event.detail.value]!"><view>{{ adjustment.direction }}　›</view></picker></view>
          <input v-model="adjustment.reasonCode" type="text" placeholder="原因代码" />
          <input v-model="adjustment.reason" type="text" placeholder="备注" />
          <button class="primary" :disabled="working" @click="submitAdjustment">提交调整</button>
          <view class="lookup-line"><input v-model="adjustmentId" placeholder="调整记录 ID" /><button @click="inspectAdjustment">查询</button></view>
        </section>

        <section class="admin-paper admin-paper--coral">
          <view class="section-heading"><text>批次任务</text><small>提交、查询明细并重试失败项</small></view>
          <textarea v-model="batchJson" maxlength="6000" />
          <button class="primary" :disabled="working" @click="submitBatch">提交批次</button>
          <view class="lookup-line"><input v-model="batchId" placeholder="批次 ID" /><button @click="inspectBatch(false)">查询</button><button @click="inspectBatch(true)">明细</button></view>
          <input v-model="retryItemIds" placeholder="重试 itemId，多个用逗号分隔" />
          <button class="secondary" :disabled="working" @click="retryBatch">重试失败项</button>
        </section>
      </template>

      <text v-if="error" class="admin-error">{{ error }}</text>
      <section v-if="result" class="result-paper"><text>最近一次结果</text><scroll-view scroll-y><text>{{ result }}</text></scroll-view></section>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page { overflow-x:hidden; }
.admin-content { display:flex; flex-direction:column; gap:20rpx; padding-bottom:36rpx; }
.admin-paper { padding:26rpx; border-radius:20rpx 30rpx 18rpx; background:rgba(255,253,247,.9); box-shadow:var(--tago-shadow); }
.admin-paper--yellow { background:linear-gradient(140deg,#fff8dc,#f8edc6); }
.admin-paper--green { background:linear-gradient(140deg,#f2f8ed,#e5f0de); }
.admin-paper--blue { background:linear-gradient(140deg,#f2f8fb,#e2eff6); }
.admin-paper--coral { background:linear-gradient(140deg,#fff7f1,#f5e0d6); }
.section-heading { display:flex; flex-direction:column; margin-bottom:18rpx; }
.section-heading text { font-size:27rpx; font-weight:900; }
.section-heading small { margin-top:5rpx; color:var(--tago-muted); font-size:17rpx; }
.admin-paper input,.admin-paper textarea { width:100%; margin-bottom:12rpx; padding:0 18rpx; border:1rpx solid rgba(255,255,255,.76); border-radius:15rpx; background:rgba(255,253,247,.78); font-size:20rpx; }
.admin-paper input { height:68rpx; }
.admin-paper textarea { height:260rpx; padding-top:15rpx; font-family:monospace; line-height:1.45; }
.primary,.secondary,.danger { height:64rpx; border-radius:999rpx; font-size:20rpx; line-height:62rpx; }
.primary { color:#fff; border:0; background:var(--tago-primary); }
.secondary { color:var(--tago-primary); border:1rpx solid var(--tago-primary); background:rgba(255,255,255,.45); }
.danger { color:var(--tago-danger); border:1rpx solid var(--tago-danger); background:rgba(255,255,255,.45); }
.primary::after,.secondary::after,.danger::after,.lookup-line button::after { border:0; }
.button-row { display:grid; grid-template-columns:1fr 1fr; gap:12rpx; }
.input-pair { display:grid; grid-template-columns:1fr 1fr; gap:12rpx; }
.input-pair picker { display:flex; align-items:center; height:68rpx; padding:0 18rpx; border-radius:15rpx; background:rgba(255,253,247,.78); color:var(--tago-primary); font-size:20rpx; }
.lookup-line { display:grid; grid-template-columns:minmax(0,1fr) max-content max-content; gap:8rpx; margin-top:14rpx; }
.lookup-line input { margin:0; }
.lookup-line button { height:68rpx; padding:0 18rpx; color:var(--tago-primary); border:0; background:transparent; font-size:19rpx; line-height:68rpx; }
.admin-error { padding:18rpx; color:var(--tago-danger); border-radius:15rpx; background:rgba(233,96,82,.08); font-size:19rpx; }
.result-paper { padding:22rpx; border-radius:18rpx; background:rgba(255,253,247,.9); }
.result-paper>text { display:block; margin-bottom:12rpx; font-size:22rpx; font-weight:900; }
.result-paper scroll-view { max-height:360rpx; }
.result-paper scroll-view text { white-space:pre-wrap; font-family:monospace; font-size:16rpx; line-height:1.5; }
</style>
