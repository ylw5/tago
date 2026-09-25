<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, shallowRef } from 'vue'
import type { components } from '@/api/types/generated'
import { getWalletBalance, listWalletEntries } from '@/api/wallet'
import AsyncState from '@/components/ui/AsyncState.vue'
import { goBack } from '@/utils/navigation'

type Balance = components['schemas']['WalletBalance']
type Entry = components['schemas']['WalletEntry']

const COINS_PER_YUAN = 10
const packages = [
  { coins: 100, tint: '#fbf1d3' },
  { coins: 300, tint: '#e3f1e3' },
  { coins: 500, tint: '#e1edf7' },
  { coins: 1000, tint: '#e3f1e3' },
  { coins: 3000, tint: '#ece6f5' },
  { coins: 5000, tint: '#fbe9e0' },
]
const sourceLabels: Record<string, string> = {
  EXPOSURE_PURCHASE: '参与 Tag 置顶',
  EXPOSURE_BID: '参与 Tag 置顶',
  TEST_GRANT: '获取星币',
  REFUND: '置顶星币退回',
  SIGNUP_BONUS: '新人见面礼',
  ADMIN_ADJUSTMENT: '获取星币',
  GIFT: '收到一份礼物',
}

const balance = shallowRef<Balance | null>(null)
const entries = shallowRef<Entry[]>([])
const selectedCoins = shallowRef(300)
const loading = shallowRef(false)
const error = shallowRef('')

const price = computed(() => selectedCoins.value / COINS_PER_YUAN)

function entryTitle(entry: Entry) { return sourceLabels[entry.sourceType] || (isIncome(entry) ? '获取星币' : '星币支出') }
function entryTime(value: string) {
  const time = dayjs(value)
  if (!time.isValid()) return value
  if (time.isSame(dayjs(), 'day')) return `今天 ${time.format('HH:mm')}`
  if (time.isSame(dayjs().subtract(1, 'day'), 'day')) return `昨天 ${time.format('HH:mm')}`
  return time.format(time.isSame(dayjs(), 'year') ? 'M月D日 HH:mm' : 'YYYY年M月D日')
}
function isIncome(entry: Entry) { return Number(entry.delta) > 0 }

async function load() {
  loading.value = true
  error.value = ''
  try { [balance.value, entries.value] = await Promise.all([getWalletBalance(), listWalletEntries({ limit: 20 })]) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '钱包加载失败' }
  finally { loading.value = false }
}

function showExchangeRule() {
  uni.showModal({ title: '星币兑换说明', content: `${COINS_PER_YUAN} 星币 = 1 元。星币可用于参与 Tag 置顶与轮播，让更多人看见你的期待。`, showCancel: false, confirmColor: '#20584f' })
}
function showEarnRule() {
  uni.showModal({ title: '获取星币', content: '选择下方的星币数量充值即可获得星币；新人礼物与活动奖励也会自动存入钱包。', showCancel: false, confirmColor: '#20584f' })
}
function recharge() {
  uni.showToast({ title: '充值通道即将开放', icon: 'none' })
}

onShow(load)
</script>

<template>
  <view class="wallet">
    <view class="wallet__top">
      <button class="wallet__back" aria-label="返回" @click="goBack" />
      <text class="wallet__title">我的钱包</text>
      <text class="wallet__note">让美好的相遇\n被更多人看见 ˘ᴗ˘</text>
    </view>

    <AsyncState :loading="loading && !balance" :error="error" @retry="load">
      <view class="balance">
        <view class="balance__copy">
          <text class="balance__label">我的星币</text>
          <view class="balance__amount">
            <image src="/static/stickers/coin.png" mode="aspectFit" />
            <text>{{ balance?.available ?? '—' }}</text>
          </view>
          <text class="balance__hint">星星留给那些想被更多人看见的时刻</text>
        </view>
        <view class="balance__art" aria-hidden="true">
          <image class="balance__bushes" src="/static/decor/bushes.png" mode="aspectFit" />
          <image class="balance__cat" src="/static/illustrations/cat-lying.png" mode="aspectFit" />
          <text>小小的星星\n也能点亮大大的相遇 ♥</text>
        </view>
        <text v-if="balance && Number(balance.reserved) > 0" class="balance__reserved">置顶中留存 {{ balance.reserved }}</text>
      </view>

      <view class="card exchange">
        <view class="exchange__head" @click="showExchangeRule">
          <text class="card__title">星币兑换说明</text>
          <image class="card__help" src="/static/icons/question.png" mode="aspectFit" />
        </view>
        <text class="exchange__rate">{{ COINS_PER_YUAN }} 星币 = 1 元</text>
        <text class="exchange__side">用星星，遇见更好的你 ♥</text>
      </view>

      <view class="card store">
        <view class="store__head">
          <view>
            <view class="store__title" @click="showEarnRule">
              <text class="card__title card__title--lg">获取星币</text>
              <image class="card__help" src="/static/icons/question.png" mode="aspectFit" />
            </view>
            <text class="store__sub">给钱包添一点星星 ˘ᴗ˘</text>
          </view>
          <text class="store__side">选择你需要的星币\n开启更多美好的相遇！</text>
        </view>
        <view class="store__grid">
          <view
            v-for="item in packages"
            :key="item.coins"
            class="package"
            :class="{ 'package--active': selectedCoins === item.coins }"
            :style="{ background: item.tint }"
            @click="selectedCoins = item.coins"
          >
            <image src="/static/stickers/coin.png" mode="aspectFit" />
            <text class="package__coins">{{ item.coins }}</text>
            <text class="package__unit">星币</text>
            <view v-if="selectedCoins === item.coins" class="package__check" />
          </view>
        </view>
        <button class="store__pay" @click="recharge">
          <view class="store__pay-copy">
            <text class="store__pay-main">去充值 ¥{{ price }}</text>
            <text class="store__pay-sub">获得 {{ selectedCoins }} 星币</text>
          </view>
          <view class="store__pay-arrow" />
        </button>
      </view>

      <view class="records">
        <view class="records__head">
          <text class="records__title">星币记录</text>
        </view>
        <view class="records__list">
          <view v-for="entry in entries" :key="entry.sequence" class="record">
            <image src="/static/stickers/coin.png" mode="aspectFit" />
            <view class="record__copy">
              <text class="record__title">{{ entryTitle(entry) }}</text>
              <text class="record__time">{{ entryTime(entry.createdAt) }}</text>
            </view>
            <text class="record__delta" :class="{ 'record__delta--in': isIncome(entry) }">{{ isIncome(entry) ? '+' : '' }}{{ entry.delta }}</text>
          </view>
          <text v-if="!entries.length" class="records__empty">还没有星币记录</text>
        </view>
      </view>
    </AsyncState>
  </view>
</template>

<style scoped lang="scss">
$ink: #20584f;
$navy: #1f3b5c;
$card: rgba(252,248,236,.95);

.wallet { min-height:100vh; padding:0 14px calc(24px + env(safe-area-inset-bottom)); background:#f4f1e8; color:$navy; }

.wallet__top { position:relative; display:flex; height:calc(64px + env(safe-area-inset-top)); align-items:center; justify-content:center; padding-top:env(safe-area-inset-top); }
.wallet__back { position:absolute; top:calc(12px + env(safe-area-inset-top)); left:0; width:40px; height:40px; padding:0; border:0; border-radius:50%; background:rgba(220,235,226,.8); }
.wallet__back::before { content:''; position:absolute; top:14px; left:16px; width:10px; height:10px; border-bottom:2.5px solid $ink; border-left:2.5px solid $ink; transform:rotate(45deg); }
.wallet__back::after { border:0; }
.wallet__title { color:$ink; font-size:24px; font-weight:900; letter-spacing:3px; }
.wallet__note { position:absolute; top:calc(10px + env(safe-area-inset-top)); right:-4px; padding:5px 8px; background:#fbeec3; color:#5d5a4a; font-size:10px; line-height:1.4; white-space:pre-line; box-shadow:0 2px 6px rgba(120,100,40,.12); transform:rotate(2deg); }

.card { position:relative; margin-top:10px; padding:14px 16px; border-radius:10px 14px 10px 12px; background:$card; box-shadow:0 2px 10px rgba(80,70,40,.07); }
.card__title { color:$navy; font-size:16px; font-weight:900; letter-spacing:1px; }
.card__title--lg { font-size:20px; }
.card__help { width:18px; height:18px; margin-left:6px; }

.balance { position:relative; display:flex; min-height:150px; margin-top:4px; padding:16px; overflow:hidden; border-radius:10px 16px 12px 10px; background:linear-gradient(135deg,#fdf3d2,#faeac0); box-shadow:0 3px 12px rgba(166,122,26,.12); }
.balance__copy { position:relative; z-index:1; display:flex; flex:1; flex-direction:column; }
.balance__label { align-self:flex-start; padding:0 6px; color:$navy; font-size:17px; font-weight:900; background:linear-gradient(transparent 55%, rgba(255,255,255,.7) 55%); }
.balance__amount { display:flex; align-items:center; gap:8px; margin:8px 0 6px; }
.balance__amount image { width:52px; height:52px; }
.balance__amount text { color:$ink; font-size:44px; font-weight:900; line-height:1; }
.balance__hint { color:#4a6484; font-size:11px; }
.balance__art { position:relative; width:130px; min-height:118px; flex:none; }
.balance__bushes { position:absolute; top:34px; right:-22px; width:150px; height:50px; opacity:.85; mix-blend-mode:multiply; }
.balance__cat { position:absolute; top:0; right:4px; width:110px; height:55px; }
.balance__art text { position:absolute; right:0; bottom:0; color:#6b5d3f; font-size:10px; line-height:1.4; text-align:right; white-space:pre-line; transform:rotate(-3deg); }
.balance__reserved { position:absolute; bottom:8px; left:16px; color:#9a7b35; font-size:10px; }

.exchange { display:flex; flex-direction:column; }
.exchange__head { display:flex; align-items:center; }
.exchange__rate { margin-top:4px; color:$navy; font-size:15px; font-weight:700; }
.exchange__side { position:absolute; right:14px; bottom:14px; color:#7a5d3a; font-size:11px; transform:rotate(-3deg); }

.store__head { display:flex; justify-content:space-between; }
.store__title { display:flex; align-items:center; }
.store__sub { color:#4a6484; font-size:11px; }
.store__side { color:#5d5a4a; font-size:10px; line-height:1.45; text-align:right; white-space:pre-line; transform:rotate(-3deg); }
.store__grid { display:grid; margin-top:12px; grid-template-columns:1fr 1fr; gap:10px; }
.package { position:relative; display:flex; height:58px; align-items:center; justify-content:center; gap:6px; border:1.5px solid transparent; border-radius:10px; box-shadow:0 1px 4px rgba(80,70,40,.06); }
.package image { width:38px; height:38px; }
.package__coins { color:#262a2c; font-size:21px; font-weight:900; }
.package__unit { color:#262a2c; font-size:13px; font-weight:700; }
.package--active { border-color:$ink; box-shadow:0 3px 10px rgba(32,88,79,.16); }
.package__check { position:absolute; top:-8px; right:-6px; width:24px; height:24px; border:2px solid #fff; border-radius:50%; background:$ink; }
.package__check::after { content:''; position:absolute; top:3px; left:7px; width:5px; height:10px; border-right:2px solid #fff; border-bottom:2px solid #fff; transform:rotate(45deg); }
.store__pay { position:relative; display:flex; width:88%; height:62px; margin:16px auto 2px; align-items:center; justify-content:center; border:0; border-radius:999px; background:linear-gradient(180deg,#1f6a60,#17504a); box-shadow:0 6px 14px rgba(23,80,74,.28); color:#fff; }
.store__pay::after { border:0; }
.store__pay-copy { display:flex; flex-direction:column; align-items:center; line-height:1.2; }
.store__pay-main { font-size:21px; font-weight:900; letter-spacing:2px; }
.store__pay-sub { margin-top:3px; font-size:12px; opacity:.9; }
.store__pay-arrow { position:absolute; top:26px; right:24px; width:9px; height:9px; border-top:2px solid #fff; border-right:2px solid #fff; transform:rotate(45deg); }

.records { margin-top:16px; }
.records__head { display:flex; align-items:center; justify-content:space-between; padding:0 4px 8px; }
.records__title { color:$navy; font-size:20px; font-weight:900; letter-spacing:1px; }
.records__list { padding:4px 14px; border-radius:10px 14px 10px 12px; background:$card; box-shadow:0 2px 10px rgba(80,70,40,.07); }
.record { display:flex; min-height:46px; align-items:center; gap:10px; border-bottom:1px solid rgba(31,59,92,.07); }
.record:last-child { border-bottom:0; }
.record image { width:32px; height:32px; flex:none; }
.record__copy { display:flex; min-width:0; flex:1; flex-direction:column; }
.record__title { color:#262a2c; font-size:14px; font-weight:800; }
.record__time { color:#4a6484; font-size:11px; }
.record__delta { color:#262a2c; font-size:17px; font-weight:800; }
.record__delta--in { color:#2f8a4f; }
.records__empty { display:block; padding:18px 0; color:#8b918a; font-size:12px; text-align:center; }
</style>
