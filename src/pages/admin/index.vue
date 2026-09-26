<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, shallowRef } from 'vue'
import type { components } from '@/api/types/generated'
import {
  createAdjustment,
  createAdjustmentBatch,
  findAdminUser,
  freezeUser,
  getAdjustment,
  getAdjustmentBatch,
  listAdjustmentBatchItems,
  listAdminGiftTiers,
  retryAdjustmentBatch,
  unfreezeUser,
  upsertAdminGiftTier,
} from '@/api/admin'
import type {
  AdminGiftTierDto,
  AdminUserDto,
  AdjustmentBatchDto,
  AdjustmentBatchItemDto,
  AdjustmentDto,
} from '@/api/admin'
import { ApiError } from '@/api/client'
import AppHeader from '@/components/business/AppHeader.vue'
import { useUserStore } from '@/stores/user'
import { goBack } from '@/utils/navigation'

type AdjustmentInput = components['schemas']['AdjustmentInput']
type BatchInput = components['schemas']['BatchInput']
type AdminPanel = 'users' | 'coin' | 'batches' | 'gifts'
type AccessState = 'loading' | 'ready' | 'denied' | 'unavailable'

const panels: { id: AdminPanel; label: string; index: string }[] = [
  { id: 'users', label: '用户', index: '01' },
  { id: 'coin', label: 'Coin 调整', index: '02' },
  { id: 'batches', label: '批次', index: '03' },
  { id: 'gifts', label: '礼物档位', index: '04' },
]
const access = shallowRef<AccessState>('loading')
const activePanel = shallowRef<AdminPanel>('users')
const busy = shallowRef(false)
const pageError = shallowRef('')
const actionError = shallowRef('')
const userEmail = shallowRef('')
const selectedUser = shallowRef<AdminUserDto | null>(null)
const giftTiers = shallowRef<AdminGiftTierDto[]>([])
const adjustment = reactive<AdjustmentInput>({
  email: '',
  amount: '10',
  direction: 'CREDIT',
  reasonCode: 'MANUAL',
  reason: '',
})
const adjustmentResult = shallowRef<AdjustmentDto | null>(null)
const adjustmentId = shallowRef('')
const inspectedAdjustment = shallowRef<AdjustmentDto | null>(null)
const batchJson = shallowRef('[]')
const batchId = shallowRef('')
const batchStatus = shallowRef<AdjustmentBatchDto | null>(null)
const batchItems = shallowRef<AdjustmentBatchItemDto[]>([])
const retryItemIds = shallowRef('')
const editingTierCode = shallowRef<string | null>(null)
const tierCode = shallowRef('')
const tierForm = reactive({ displayName: '', price: '100', enabled: true, sortOrder: '0' })
const giftTierSaving = shallowRef(false)

const coinIsValid = computed(() => isPositiveLong(adjustment.amount))
const tierPriceIsValid = computed(() => parseNonNegativeInteger(tierForm.price, true) !== null)
const tierSortIsValid = computed(() => {
  const value = parseNonNegativeInteger(tierForm.sortOrder)
  return value !== null && value <= 2147483647
})

const pendingKeys = new Map<string, { fingerprint: string; key: string }>()

function isPositiveLong(value: string) {
  if (!/^\d+$/.test(value)) return false
  const normalized = value.replace(/^0+/, '')
  return normalized.length > 0
    && (normalized.length < 19 || (normalized.length === 19 && normalized <= '9223372036854775807'))
}

function parseNonNegativeInteger(value: string, positive = false) {
  if (!/^\d+$/.test(value)) return null
  const normalized = value.replace(/^0+/, '') || '0'
  if (positive && normalized === '0') return null
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function createIdempotencyKey() {
  return `admin-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function idempotencyKey(scope: string, fingerprintValue: unknown) {
  const fingerprint = JSON.stringify(fingerprintValue)
  const pending = pendingKeys.get(scope)
  if (pending?.fingerprint === fingerprint) return pending.key
  const key = createIdempotencyKey()
  pendingKeys.set(scope, { fingerprint, key })
  return key
}

function clearIdempotencyKey(scope: string, key: string) {
  if (pendingKeys.get(scope)?.key === key) pendingKeys.delete(scope)
}

function redirectToLogin() {
  useUserStore().clear()
  uni.reLaunch({ url: `/pages/auth/login?redirect=${encodeURIComponent('/pages/admin/index')}` })
}

function isSessionFailure(error: unknown) {
  return error instanceof ApiError
    && ['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED', 'SESSION_REPLACED', 'SESSION_REVOKED'].includes(error.code)
}

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'ADMIN_ACCESS_DENIED') return '当前账号没有管理员权限。'
    if (error.code === 'ACCOUNT_NOT_FOUND') return '没有找到这个邮箱对应的用户。'
    if (error.code === 'GOVERNANCE_VERSION_CONFLICT' || error.code === 'GIFT_TIER_VERSION_CONFLICT') {
      return '数据已发生变化，请刷新后重新确认。'
    }
    if (error.statusCode === 409) return '数据已发生变化，请刷新后重试。'
    if (error.code === 'AUTHENTICATION_REQUIRED' || error.code.startsWith('SESSION_')) return '登录已失效，正在返回登录页。'
    return error.message || '管理员操作失败，请重试。'
  }
  return error instanceof Error ? error.message : '管理员操作失败，请重试。'
}

function handleError(error: unknown) {
  if (isSessionFailure(error)) {
    redirectToLogin()
    return messageFor(error)
  }
  if (error instanceof ApiError && error.code === 'ADMIN_ACCESS_DENIED') {
    access.value = 'denied'
    selectedUser.value = null
    return messageFor(error)
  }
  return messageFor(error)
}

async function checkAdminAccess() {
  access.value = 'loading'
  pageError.value = ''
  try {
    giftTiers.value = await listAdminGiftTiers()
    access.value = 'ready'
  }
  catch (error) {
    if (error instanceof ApiError && error.code === 'ADMIN_ACCESS_DENIED') {
      access.value = 'denied'
    }
    else {
      pageError.value = handleError(error)
      access.value = 'unavailable'
    }
  }
}

async function run<T>(task: () => Promise<T>): Promise<T | null> {
  if (busy.value) return null
  busy.value = true
  actionError.value = ''
  try {
    return await task()
  }
  catch (error) {
    actionError.value = handleError(error)
    return null
  }
  finally {
    busy.value = false
  }
}

function confirmAction(title: string, content: string) {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText: '确认操作',
      cancelText: '再想想',
      confirmColor: '#a84832',
      success: result => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
}

async function searchUser() {
  const email = userEmail.value.trim()
  if (!email) {
    actionError.value = '请输入要查询的邮箱。'
    return
  }
  const user = await run(() => findAdminUser(email))
  if (user) {
    selectedUser.value = user
    adjustment.email = user.email
  }
}

async function changeUserStatus(freeze: boolean) {
  const user = selectedUser.value
  if (!user || busy.value) return
  const verb = freeze ? '冻结' : '解除冻结'
  const confirmed = await confirmAction(`${verb}用户`, `确认${verb} ${user.email}？`)
  if (!confirmed) return

  const scope = `status:${user.userId}`
  const request = { userId: user.userId, expectedGovernanceVersion: user.governanceVersion, freeze }
  const key = idempotencyKey(scope, request)
  const updated = await run(() => freeze
    ? freezeUser(user.userId, user.governanceVersion, key)
    : unfreezeUser(user.userId, user.governanceVersion, key))
  if (updated) {
    selectedUser.value = updated
    clearIdempotencyKey(scope, key)
    uni.showToast({ title: freeze ? '用户已冻结' : '用户已解冻', icon: 'none' })
  }
}

function positiveCoin(value: string) {
  return isPositiveLong(value)
}

async function submitAdjustment() {
  const body = {
    ...adjustment,
    email: adjustment.email.trim(),
    reasonCode: adjustment.reasonCode.trim(),
    reason: adjustment.reason.trim(),
  }
  if (!body.email || !body.reasonCode || !body.reason || !positiveCoin(body.amount)) {
    actionError.value = '请检查邮箱、金额、原因代码和备注；Coin 数量必须是正整数。'
    return
  }
  const verb = body.direction === 'DEBIT' ? '扣除' : '增加'
  if (!await confirmAction('确认钱包调账', `确认给 ${body.email}${verb} ${body.amount} Coin？`)) return

  const key = idempotencyKey('adjustment', body)
  const result = await run(() => createAdjustment(body, key))
  if (result) {
    adjustmentResult.value = result
    clearIdempotencyKey('adjustment', key)
    uni.showToast({ title: '调账已提交', icon: 'success' })
  }
}

async function inspectAdjustmentById() {
  if (!adjustmentId.value.trim()) {
    actionError.value = '请输入调账记录 ID。'
    return
  }
  inspectedAdjustment.value = await run(() => getAdjustment(adjustmentId.value.trim()))
}

function readBatchRows(): BatchInput['items'] {
  const parsed: unknown = JSON.parse(batchJson.value)
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 200) {
    throw new Error('批次必须是包含 1 到 200 条记录的 JSON 数组。')
  }
  for (const row of parsed) {
    if (!row || typeof row !== 'object') throw new Error('每条记录都必须是 JSON 对象。')
    const item = row as Record<string, unknown>
    if (typeof item.email !== 'string' || !item.email.trim()
      || (item.direction !== 'CREDIT' && item.direction !== 'DEBIT')
      || typeof item.amount !== 'string' || !isPositiveLong(item.amount)
      || typeof item.reasonCode !== 'string' || !item.reasonCode.trim() || item.reasonCode.length > 64
      || typeof item.reason !== 'string' || !item.reason.trim() || item.reason.length > 1000) {
      throw new Error('每条记录需包含有效 email、CREDIT/DEBIT、字符串 amount、reasonCode 和 reason。')
    }
  }
  return parsed as BatchInput['items']
}

async function submitBatch() {
  let items: BatchInput['items']
  try { items = readBatchRows() }
  catch (error) {
    actionError.value = error instanceof Error ? error.message : '批次 JSON 格式无效。'
    return
  }
  const body: BatchInput = { items }
  const key = idempotencyKey('batch', body)
  const result = await run(() => createAdjustmentBatch(body, key))
  if (result) {
    batchId.value = result.batchId || ''
    batchStatus.value = result
    batchItems.value = []
    clearIdempotencyKey('batch', key)
    uni.showToast({ title: '批次已提交', icon: 'success' })
  }
}

async function refreshBatch() {
  const id = batchId.value.trim()
  if (!id) {
    actionError.value = '请输入批次 ID。'
    return
  }
  const status = await run(() => getAdjustmentBatch(id))
  if (status) batchStatus.value = status
}

async function loadBatchItems() {
  const id = batchId.value.trim()
  if (!id) {
    actionError.value = '请输入批次 ID。'
    return
  }
  const items = await run(() => listAdjustmentBatchItems(id))
  if (items) batchItems.value = items
}

async function retryBatchItems() {
  const batch = batchId.value.trim()
  const itemIds = retryItemIds.value.split(',').map(value => value.trim()).filter(Boolean)
  if (!batch || itemIds.length === 0) {
    actionError.value = '请输入批次 ID 和至少一个失败条目 ID。'
    return
  }
  const request = { batchId: batch, itemIds }
  const key = idempotencyKey(`retry:${batch}`, request)
  const result = await run(() => retryAdjustmentBatch(batch, { itemIds }, key))
  if (result) {
    batchStatus.value = result
    clearIdempotencyKey(`retry:${batch}`, key)
    await loadBatchItems()
  }
}

function beginNewTier() {
  editingTierCode.value = null
  tierCode.value = ''
  Object.assign(tierForm, { displayName: '', price: '100', enabled: true, sortOrder: '0' })
  actionError.value = ''
}

function editTier(tier: AdminGiftTierDto) {
  editingTierCode.value = tier.code
  tierCode.value = tier.code
  Object.assign(tierForm, {
    displayName: tier.displayName,
    price: String(tier.price),
    enabled: tier.enabled,
    sortOrder: String(tier.sortOrder),
  })
  actionError.value = ''
}

function cancelTierEdit() {
  editingTierCode.value = null
  tierCode.value = ''
  Object.assign(tierForm, { displayName: '', price: '100', enabled: true, sortOrder: '0' })
}

async function reloadGiftTiers(refreshEditor = false) {
  const tiers = await run(() => listAdminGiftTiers())
  if (tiers) {
    giftTiers.value = tiers
    if (refreshEditor && editingTierCode.value) {
      const current = tiers.find(tier => tier.code === editingTierCode.value)
      if (current) {
        editTier(current)
        uni.showToast({ title: '已载入最新档位，请重新确认', icon: 'none' })
      }
      else {
        cancelTierEdit()
      }
    }
  }
}

async function saveGiftTier() {
  const code = tierCode.value.trim()
  const displayName = tierForm.displayName.trim()
  const price = parseNonNegativeInteger(tierForm.price, true)
  const sortOrder = parseNonNegativeInteger(tierForm.sortOrder)
  if (!code || !displayName || displayName.length > 64 || price === null || sortOrder === null || sortOrder > 2147483647) {
    actionError.value = '请填写档位代码、1 到 64 个字符的名称、正整数价格和非负排序值。'
    return
  }

  const existing = editingTierCode.value
    ? giftTiers.value.find(tier => tier.code === editingTierCode.value)
    : undefined
  if (editingTierCode.value && !existing) {
    actionError.value = '档位已不在当前列表中，请重新加载后再编辑。'
    return
  }
  const body = {
    displayName,
    price,
    enabled: tierForm.enabled,
    sortOrder,
    expectedVersion: existing?.configVersion ?? 0,
  }
  const updated = await run(() => upsertAdminGiftTier(code, body))
  if (updated) {
    giftTiers.value = [...giftTiers.value.filter(tier => tier.code !== updated.code), updated]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code))
    cancelTierEdit()
    uni.showToast({ title: '档位配置已保存', icon: 'success' })
  }
}

onLoad(() => { void checkAdminAccess() })
</script>

<template>
  <view class="tago-page tago-page--detail admin-page">
    <AppHeader back title="管理员工作台" subtitle="用户、Coin 与礼物配置" @back="goBack" />

    <view v-if="access === 'loading'" class="state-card">
      <text class="state-card__eyebrow">TAGO · OPERATIONS</text>
      <text class="state-card__title">正在确认管理权限</text>
      <text class="state-card__copy">使用当前网页登录会话检查管理员资格。</text>
    </view>

    <view v-else-if="access === 'denied'" class="state-card state-card--denied">
      <text class="state-card__eyebrow">ACCESS / 403</text>
      <text class="state-card__title">当前账号没有管理员权限</text>
      <text class="state-card__copy">管理员权限由服务端会话和启用状态决定。此页面不会开放管理操作。</text>
    </view>

    <view v-else-if="access === 'unavailable'" class="state-card state-card--unavailable">
      <text class="state-card__eyebrow">CONNECTION / RETRY</text>
      <text class="state-card__title">暂时无法读取管理数据</text>
      <text class="state-card__copy">{{ pageError || '服务暂不可用，请重试。' }}</text>
      <button class="button button--primary state-card__retry" :disabled="busy" @click="checkAdminAccess">重新检查</button>
    </view>

    <view v-else class="workbench">
      <section class="workbench-hero">
        <view class="workbench-hero__topline">
          <text>TAGO / OPERATIONS</text>
          <view class="session-chip"><i />SESSION OK</view>
        </view>
        <text class="workbench-hero__title">把每一笔运营动作，<br>留在清楚的记录里。</text>
        <text class="workbench-hero__copy">用户状态、Coin 流水与礼物档位都由服务端版本和审计结果确认。</text>
        <view class="workbench-hero__foot"><text>管理员会话</text><text>写操作自动携带 CSRF 与幂等键</text></view>
      </section>

      <view class="panel-switcher" aria-label="管理员功能">
        <button
          v-for="panel in panels"
          :key="panel.id"
          class="panel-switcher__item"
          :class="{ 'panel-switcher__item--active': activePanel === panel.id }"
          :disabled="busy"
          @click="activePanel = panel.id"
        >
          <text class="panel-switcher__index">{{ panel.index }}</text>
          <text>{{ panel.label }}</text>
        </button>
      </view>

      <view v-if="actionError" class="notice notice--error" role="alert">
        <text>{{ actionError }}</text>
        <button v-if="actionError.includes('数据已发生变化')" @click="activePanel === 'gifts' ? reloadGiftTiers(true) : searchUser()">刷新数据</button>
      </view>

      <view v-if="activePanel === 'users'" class="panel-stack">
        <section class="paper-card paper-card--lead">
          <view class="card-heading"><text class="card-kicker">01 / USER STATUS</text><text class="card-title">查找一个账号</text></view>
          <view class="search-row">
            <input v-model="userEmail" class="field" type="text" maxlength="254" placeholder="输入用户邮箱" @confirm="searchUser">
            <button class="button button--primary" :disabled="busy" @click="searchUser">查询</button>
          </view>
        </section>

        <section v-if="selectedUser" class="paper-card user-card">
          <view class="user-card__heading">
            <view><text class="card-kicker">ACCOUNT / {{ selectedUser.userId }}</text><text class="user-card__email">{{ selectedUser.email }}</text></view>
            <text class="status-pill" :class="selectedUser.status === 'FROZEN' ? 'status-pill--frozen' : 'status-pill--active'">{{ selectedUser.status === 'FROZEN' ? '已冻结' : selectedUser.status }}</text>
          </view>
          <view class="metric-grid">
            <view class="metric"><text>账户余额</text><strong>{{ selectedUser.balance }}</strong><small>Coin</small></view>
            <view class="metric"><text>可用余额</text><strong>{{ selectedUser.available }}</strong><small>Coin</small></view>
            <view class="metric"><text>已预留</text><strong>{{ selectedUser.reserved }}</strong><small>Coin</small></view>
            <view class="metric"><text>可支配</text><strong>{{ selectedUser.spendable }}</strong><small>Coin</small></view>
          </view>
          <view class="user-card__meta"><text>治理版本 <b>{{ selectedUser.governanceVersion }}</b></text><text v-if="selectedUser.recoveryOutstanding" class="recovery-flag">存在待恢复账务</text></view>
          <view class="user-card__actions">
            <button v-if="selectedUser.status === 'ACTIVE'" class="button button--danger" :disabled="busy" @click="changeUserStatus(true)">冻结该用户</button>
            <button v-else-if="selectedUser.status === 'FROZEN'" class="button button--primary" :disabled="busy" @click="changeUserStatus(false)">解除冻结</button>
            <button class="button button--quiet" :disabled="busy" @click="searchUser">刷新资料</button>
          </view>
          <text class="card-footnote">变更会提交当前治理版本；冲突时请重新查询，不会覆盖新状态。</text>
        </section>
      </view>

      <view v-else-if="activePanel === 'coin'" class="panel-stack">
        <section class="paper-card">
          <view class="card-heading"><text class="card-kicker">02 / SINGLE ENTRY</text><text class="card-title">单笔 Coin 调整</text></view>
          <view class="form-grid">
            <label class="form-field form-field--wide"><text>用户邮箱</text><input v-model="adjustment.email" class="field" type="text" maxlength="254" placeholder="user@example.com"></label>
            <label class="form-field"><text>方向</text><picker :range="['增加 CREDIT', '扣除 DEBIT']" @change="adjustment.direction = (['CREDIT', 'DEBIT'] as const)[$event.detail.value] || 'CREDIT'"><view class="field picker-value">{{ adjustment.direction === 'CREDIT' ? '增加 · CREDIT' : '扣除 · DEBIT' }}<b>⌄</b></view></picker></label>
            <label class="form-field"><text>Coin 数量</text><input v-model="adjustment.amount" class="field" type="number" maxlength="19" placeholder="正整数"></label>
            <label class="form-field"><text>原因代码</text><input v-model="adjustment.reasonCode" class="field" maxlength="64" placeholder="MANUAL"></label>
            <label class="form-field form-field--wide"><text>运营备注</text><textarea v-model="adjustment.reason" class="field field--textarea" maxlength="1000" placeholder="记录这次调整的原因"></textarea></label>
          </view>
          <view class="form-footer"><text>金额以十进制字符串提交，不经过浮点计算。</text><button class="button button--primary" :disabled="busy || !coinIsValid" @click="submitAdjustment">确认并提交</button></view>
        </section>

        <section v-if="adjustmentResult" class="paper-card result-card">
          <view class="card-heading"><text class="card-kicker">RECORDED / ADJUSTMENT</text><text class="card-title">服务端回执</text></view>
          <view class="receipt-grid">
            <text>记录 ID</text><strong>{{ adjustmentResult.adjustmentId || '—' }}</strong>
            <text>变更</text><strong>{{ adjustmentResult.delta || '—' }} Coin</strong>
            <text>调整前</text><strong>{{ adjustmentResult.balanceBefore || '—' }} Coin</strong>
            <text>调整后</text><strong>{{ adjustmentResult.balanceAfter || '—' }} Coin</strong>
            <text>提交时间</text><strong>{{ adjustmentResult.createdAt || '—' }}</strong>
          </view>
        </section>

        <section class="paper-card">
          <view class="card-heading"><text class="card-kicker">AUDIT / LOOKUP</text><text class="card-title">查询调账记录</text></view>
          <view class="search-row"><input v-model="adjustmentId" class="field" placeholder="调账记录 ID"><button class="button button--quiet" :disabled="busy" @click="inspectAdjustmentById">读取</button></view>
          <view v-if="inspectedAdjustment" class="compact-result"><text>{{ inspectedAdjustment.email || inspectedAdjustment.userId }}</text><strong>{{ inspectedAdjustment.direction }} {{ inspectedAdjustment.amount }} Coin</strong><small>{{ inspectedAdjustment.adjustmentId }} · {{ inspectedAdjustment.createdAt }}</small></view>
        </section>
      </view>

      <view v-else-if="activePanel === 'batches'" class="panel-stack">
        <section class="paper-card">
          <view class="card-heading"><text class="card-kicker">03 / BATCH LEDGER</text><text class="card-title">提交批量任务</text></view>
          <text class="field-hint">填写 1–200 条记录。amount 必须使用字符串，direction 为 CREDIT 或 DEBIT。</text>
          <textarea v-model="batchJson" class="field field--json" maxlength="12000" placeholder='[{"email":"user@example.com","amount":"10","direction":"CREDIT","reasonCode":"MANUAL","reason":"运营补偿"}]'></textarea>
          <view class="form-footer"><text>每个条目由服务端独立校验并记录状态。</text><button class="button button--primary" :disabled="busy" @click="submitBatch">提交批次</button></view>
        </section>

        <section class="paper-card">
          <view class="card-heading"><text class="card-kicker">STATUS / ITEMS / RETRY</text><text class="card-title">跟踪批次</text></view>
          <view class="search-row"><input v-model="batchId" class="field" placeholder="批次 ID"><button class="button button--quiet" :disabled="busy" @click="refreshBatch">刷新</button><button class="button button--quiet" :disabled="busy" @click="loadBatchItems">明细</button></view>
          <view v-if="batchStatus" class="batch-status">
            <view class="batch-status__top"><text>{{ batchStatus.batchId }}</text><b>{{ batchStatus.state }}</b></view>
            <view class="batch-counts"><text>总数 <b>{{ batchStatus.total ?? 0 }}</b></text><text>处理中 <b>{{ (batchStatus.pending ?? 0) + (batchStatus.processing ?? 0) }}</b></text><text>成功 <b>{{ batchStatus.success ?? 0 }}</b></text><text>失败 <b>{{ batchStatus.failed ?? 0 }}</b></text><text>已停止 <b>{{ batchStatus.stopped ?? 0 }}</b></text></view>
          </view>
          <view v-if="batchItems.length" class="batch-items">
            <view v-for="item in batchItems" :key="item.itemId" class="batch-item">
              <view><strong>#{{ item.itemNo }} · {{ item.email || item.userId }}</strong><small>{{ item.direction }} {{ item.amount }} Coin · {{ item.state }}</small></view>
              <small v-if="item.errorCode" class="batch-item__error">{{ item.errorCode }} · {{ item.errorMessage }}</small>
              <small v-if="item.itemId" class="batch-item__id">itemId: {{ item.itemId }}</small>
            </view>
          </view>
          <view class="retry-row"><input v-model="retryItemIds" class="field" placeholder="失败 itemId，多个用逗号分隔"><button class="button button--danger" :disabled="busy" @click="retryBatchItems">重试失败项</button></view>
        </section>
      </view>

      <view v-else class="panel-stack">
        <section class="paper-card">
          <view class="card-heading card-heading--split"><view><text class="card-kicker">04 / GIFT CATALOG</text><text class="card-title">礼物档位</text></view><button class="button button--quiet" :disabled="busy" @click="reloadGiftTiers(false)">重新加载</button></view>
          <view v-if="giftTiers.length" class="tier-list">
            <view v-for="tier in giftTiers" :key="tier.code" class="tier-row">
              <view class="tier-row__identity"><text class="tier-row__code">{{ tier.code }}</text><text class="tier-row__name">{{ tier.displayName }}</text></view>
              <view class="tier-row__price"><strong>{{ tier.price }}</strong><small>Coin · {{ tier.enabled ? '启用' : '停用' }}</small></view>
              <view class="tier-row__meta"><text>顺序 {{ tier.sortOrder }}</text><text>版本 {{ tier.configVersion }}</text></view>
              <button class="button button--quiet" :disabled="busy" @click="editTier(tier)">编辑</button>
            </view>
          </view>
          <text v-else class="empty-copy">暂时没有礼物档位，可以创建第一个。</text>
        </section>

        <section class="paper-card tier-editor">
          <view class="card-heading"><text class="card-kicker">{{ editingTierCode ? 'EDIT / VERSIONED' : 'NEW / VERSION 0' }}</text><text class="card-title">{{ editingTierCode ? `编辑 ${editingTierCode}` : '创建档位' }}</text></view>
          <view class="form-grid">
            <label class="form-field"><text>档位代码</text><input v-model="tierCode" class="field" maxlength="64" :disabled="Boolean(editingTierCode)" placeholder="例如 HELLO"></label>
            <label class="form-field"><text>展示名称</text><input v-model="tierForm.displayName" class="field" maxlength="64" placeholder="礼物名称"></label>
            <label class="form-field"><text>价格 · Coin</text><input v-model="tierForm.price" class="field" type="number" maxlength="16" placeholder="正整数"></label>
            <label class="form-field"><text>显示顺序</text><input v-model="tierForm.sortOrder" class="field" type="number" maxlength="10" placeholder="0"></label>
            <label class="form-field"><text>对用户开放</text><picker :range="['启用', '停用']" @change="tierForm.enabled = $event.detail.value === 0"><view class="field picker-value">{{ tierForm.enabled ? '启用' : '停用' }}<b>⌄</b></view></picker></label>
          </view>
          <view class="form-footer"><text>{{ editingTierCode ? '使用读取到的配置版本保存。' : '新档位以 expectedVersion = 0 创建。' }}</text><view class="button-pair"><button v-if="editingTierCode" class="button button--quiet" :disabled="busy" @click="cancelTierEdit">取消</button><button class="button button--primary" :disabled="busy || !tierPriceIsValid || !tierSortIsValid" @click="saveGiftTier">保存配置</button></view></view>
        </section>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page {
  --admin-forest:#183e35;
  --admin-leaf:#2c6654;
  --admin-ink:#20332b;
  --admin-muted:#718078;
  --admin-paper:#fffdf7;
  --admin-line:rgba(24,62,53,.12);
  --admin-rust:#a84832;
  min-height:100vh;
  padding-bottom:36rpx;
  background:radial-gradient(ellipse at 100% 0%,rgba(226,194,131,.23),transparent 42%),linear-gradient(180deg,#f4f1e8 0%,#e9eee7 100%);
  color:var(--admin-ink);
}
.workbench,.state-card { display:flex; flex-direction:column; gap:18rpx; }
.workbench { padding-bottom:32rpx; }
.workbench-hero { position:relative; display:flex; flex-direction:column; min-height:310rpx; padding:30rpx; overflow:hidden; color:#f7f3e8; border-radius:16rpx 30rpx 18rpx 28rpx; background:linear-gradient(132deg,#183e35 0%,#245547 64%,#39715e 100%); box-shadow:0 18rpx 38rpx rgba(24,62,53,.17); }
.workbench-hero::after { position:absolute; right:-80rpx; bottom:-130rpx; width:390rpx; height:390rpx; border:1rpx solid rgba(255,255,255,.15); border-radius:50%; box-shadow:0 0 0 36rpx rgba(255,255,255,.035),0 0 0 72rpx rgba(255,255,255,.025); content:''; }
.workbench-hero__topline,.workbench-hero__foot { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:14rpx; }
.workbench-hero__topline { color:rgba(255,255,255,.7); font-size:16rpx; font-weight:800; letter-spacing:2rpx; }
.session-chip { display:flex; align-items:center; gap:8rpx; padding:8rpx 13rpx; border:1rpx solid rgba(255,255,255,.24); border-radius:99rpx; color:#d8e9c7; font-size:14rpx; letter-spacing:1rpx; }
.session-chip i { width:10rpx; height:10rpx; border-radius:50%; background:#cbe59c; box-shadow:0 0 12rpx rgba(203,229,156,.65); }
.workbench-hero__title { position:relative; z-index:1; margin-top:24rpx; font-size:39rpx; font-weight:900; line-height:1.3; letter-spacing:1rpx; }
.workbench-hero__copy { position:relative; z-index:1; max-width:620rpx; margin-top:14rpx; color:rgba(255,255,255,.76); font-size:19rpx; line-height:1.55; }
.workbench-hero__foot { margin-top:auto; padding-top:23rpx; color:rgba(255,255,255,.62); font-size:15rpx; }
.panel-switcher { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8rpx; padding:8rpx; border:1rpx solid rgba(255,255,255,.85); border-radius:19rpx; background:rgba(255,253,247,.78); box-shadow:0 8rpx 20rpx rgba(24,62,53,.06); }
.panel-switcher__item { display:flex; min-width:0; min-height:78rpx; flex-direction:column; align-items:flex-start; justify-content:center; gap:5rpx; margin:0; padding:9rpx 13rpx; color:var(--admin-muted); border:0; border-radius:13rpx; background:transparent; font-size:18rpx; line-height:1.2; text-align:left; }
.panel-switcher__item::after { border:0; }
.panel-switcher__item--active { color:#fff; background:var(--admin-forest); box-shadow:0 7rpx 16rpx rgba(24,62,53,.2); }
.panel-switcher__index { color:#b8cfae; font-size:13rpx; font-weight:800; letter-spacing:1rpx; }
.panel-stack { display:flex; flex-direction:column; gap:16rpx; }
.paper-card,.state-card { padding:24rpx; border:1rpx solid rgba(255,255,255,.82); border-radius:18rpx 26rpx 18rpx 24rpx; background:var(--admin-paper); box-shadow:0 12rpx 28rpx rgba(35,57,46,.07); }
.paper-card--lead { border-left:7rpx solid #c48a4d; }
.card-heading { display:flex; flex-direction:column; gap:6rpx; margin-bottom:20rpx; }
.card-heading--split { flex-direction:row; align-items:center; justify-content:space-between; }
.card-heading--split>view { display:flex; flex-direction:column; gap:6rpx; }
.card-kicker,.state-card__eyebrow { color:#a17443; font-size:14rpx; font-weight:850; letter-spacing:1.5rpx; }
.card-title,.state-card__title { color:var(--admin-ink); font-size:27rpx; font-weight:900; }
.search-row,.retry-row { display:grid; grid-template-columns:minmax(0,1fr) max-content; gap:9rpx; }
.field { box-sizing:border-box; width:100%; min-width:0; height:72rpx; padding:0 18rpx; border:1rpx solid var(--admin-line); border-radius:13rpx; outline:none; background:#f6f6ef; color:var(--admin-ink); font-size:20rpx; }
.field:focus { border-color:var(--admin-leaf); box-shadow:0 0 0 3rpx rgba(44,102,84,.12); }
.field[disabled] { color:#8a958e; background:#eceee7; }
.field--textarea { min-height:120rpx; padding:16rpx 18rpx; line-height:1.5; }
.field--json { min-height:280rpx; margin-top:13rpx; padding:18rpx; font-family:ui-monospace,Menlo,monospace; font-size:17rpx; line-height:1.5; }
.field-hint,.card-footnote { display:block; color:var(--admin-muted); font-size:16rpx; line-height:1.55; }
.button { min-height:70rpx; margin:0; padding:0 22rpx; border:1rpx solid transparent; border-radius:12rpx; font-size:18rpx; font-weight:800; line-height:1.2; white-space:nowrap; }
.button::after { border:0; }
.button[disabled] { opacity:.5; }
.button--primary { color:#fff; background:var(--admin-forest); }
.button--primary:active { background:#285747; }
.button--quiet { color:var(--admin-leaf); border-color:var(--admin-line); background:#f5f6ef; }
.button--danger { color:#fff; background:var(--admin-rust); }
.user-card__heading,.user-card__actions,.form-footer,.batch-status__top { display:flex; align-items:center; justify-content:space-between; gap:14rpx; }
.user-card__heading { align-items:flex-start; padding-bottom:17rpx; border-bottom:1rpx solid var(--admin-line); }
.user-card__heading>view { display:flex; min-width:0; flex-direction:column; gap:7rpx; }
.user-card__email { overflow-wrap:anywhere; font-size:22rpx; font-weight:850; }
.status-pill { padding:7rpx 12rpx; border-radius:99rpx; color:#365b42; background:#e7f0dd; font-size:15rpx; font-weight:800; white-space:nowrap; }
.status-pill--frozen { color:#963f2d; background:#f7e7df; }
.metric-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9rpx; margin-top:16rpx; }
.metric { display:grid; grid-template-columns:1fr max-content; align-items:baseline; padding:14rpx; border-radius:12rpx; background:#f4f4ec; }
.metric text { grid-column:1/-1; color:var(--admin-muted); font-size:15rpx; }
.metric strong { margin-top:5rpx; font-size:24rpx; }
.metric small { color:var(--admin-muted); font-size:13rpx; }
.user-card__meta { display:flex; align-items:center; justify-content:space-between; gap:12rpx; margin-top:14rpx; color:var(--admin-muted); font-size:16rpx; }
.user-card__meta b { color:var(--admin-ink); }
.recovery-flag { color:var(--admin-rust); }
.user-card__actions { justify-content:flex-start; margin-top:18rpx; }
.card-footnote { margin-top:14rpx; }
.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15rpx 12rpx; }
.form-field { display:flex; min-width:0; flex-direction:column; gap:8rpx; color:var(--admin-muted); font-size:16rpx; }
.form-field--wide { grid-column:1/-1; }
.picker-value { display:flex; align-items:center; justify-content:space-between; }
.picker-value b { color:var(--admin-leaf); font-size:23rpx; }
.form-footer { align-items:flex-end; margin-top:18rpx; }
.form-footer>text { max-width:55%; color:var(--admin-muted); font-size:15rpx; line-height:1.5; }
.button-pair { display:flex; gap:8rpx; }
.receipt-grid { display:grid; grid-template-columns:minmax(100rpx,.55fr) minmax(0,1fr); gap:11rpx; align-items:baseline; }
.receipt-grid text { color:var(--admin-muted); font-size:16rpx; }
.receipt-grid strong { overflow-wrap:anywhere; font-size:17rpx; }
.compact-result { display:flex; flex-direction:column; gap:6rpx; margin-top:16rpx; padding:15rpx; border-radius:12rpx; background:#f4f4ec; }
.compact-result>text { font-size:16rpx; }
.compact-result strong { font-size:19rpx; }
.compact-result small { color:var(--admin-muted); font-size:14rpx; overflow-wrap:anywhere; }
.batch-status { margin-top:15rpx; padding:17rpx; border-radius:13rpx; background:#edf2e9; }
.batch-status__top { overflow-wrap:anywhere; color:var(--admin-forest); font-size:16rpx; }
.batch-status__top b { padding:6rpx 10rpx; border-radius:99rpx; background:#dce9d3; }
.batch-counts { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10rpx; margin-top:15rpx; color:var(--admin-muted); font-size:15rpx; }
.batch-counts b { display:block; margin-top:4rpx; color:var(--admin-ink); font-size:21rpx; }
.batch-items { display:flex; flex-direction:column; gap:8rpx; margin-top:13rpx; }
.batch-item { display:flex; flex-direction:column; gap:6rpx; padding:13rpx; border:1rpx solid var(--admin-line); border-radius:11rpx; }
.batch-item>view { display:flex; flex-direction:column; gap:5rpx; }
.batch-item strong { overflow-wrap:anywhere; font-size:16rpx; }
.batch-item small { color:var(--admin-muted); font-size:14rpx; overflow-wrap:anywhere; }
.batch-item__error { color:var(--admin-rust)!important; }
.batch-item__id { opacity:.78; }
.retry-row { margin-top:16rpx; }
.tier-list { display:flex; flex-direction:column; gap:9rpx; }
.tier-row { display:grid; grid-template-columns:minmax(0,1fr) max-content; gap:8rpx 12rpx; align-items:center; padding:14rpx; border:1rpx solid var(--admin-line); border-radius:13rpx; background:#f8f8f1; }
.tier-row__identity,.tier-row__price { display:flex; flex-direction:column; gap:4rpx; }
.tier-row__code { color:#a17443; font-size:13rpx; font-weight:850; letter-spacing:1rpx; }
.tier-row__name { font-size:18rpx; font-weight:850; }
.tier-row__price { align-items:flex-end; }
.tier-row__price strong { font-size:22rpx; }
.tier-row__price small,.tier-row__meta { color:var(--admin-muted); font-size:14rpx; }
.tier-row__meta { display:flex; gap:13rpx; grid-column:1; }
.tier-row>.button { grid-column:2; grid-row:2; }
.tier-editor { border-top:5rpx solid #c48a4d; }
.empty-copy { color:var(--admin-muted); font-size:17rpx; }
.notice { display:flex; align-items:center; justify-content:space-between; gap:10rpx; padding:15rpx 17rpx; border-radius:12rpx; font-size:16rpx; line-height:1.45; }
.notice--error { color:#873c2e; border:1rpx solid rgba(168,72,50,.16); background:#faeee8; }
.notice button { flex:none; padding:6rpx 10rpx; color:#873c2e; border:0; border-radius:8rpx; background:#f5ddd1; font-size:14rpx; }
.state-card { min-height:270rpx; justify-content:center; gap:12rpx; }
.state-card--denied { border-left:7rpx solid var(--admin-rust); }
.state-card--unavailable { border-left:7rpx solid #c48a4d; }
.state-card__title { font-size:27rpx; }
.state-card__copy { color:var(--admin-muted); font-size:18rpx; line-height:1.6; }
.state-card__retry { align-self:flex-start; margin-top:7rpx; }

@media screen and (min-width: 760px) {
  .admin-page { padding-right:max(32rpx,calc((100vw - 920px)/2)); padding-left:max(32rpx,calc((100vw - 920px)/2)); }
  .workbench-hero { min-height:350rpx; padding:38rpx; }
  .panel-stack { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; }
  .panel-stack>.paper-card:only-child { grid-column:1/-1; }
  .metric-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
}
</style>
