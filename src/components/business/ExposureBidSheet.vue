<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { components } from '@/api/types/generated'
import { ApiError } from '@/api/client'
import { createExposureBid, getCurrentExposure, getExposureRules } from '@/api/exposure'
import { getMyTag } from '@/api/social'
import { getWalletBalance } from '@/api/wallet'

type Current = components['schemas']['ExposureCurrent']
type Rules = components['schemas']['ExposureRules']
type Phase = 'bid' | 'success' | 'outbid'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; success: [] }>()

const phase = shallowRef<Phase>('bid')
const current = shallowRef<Current | null>(null)
const rules = shallowRef<Rules | null>(null)
const tag = shallowRef<{ id: string; version: number; body: string } | null>(null)
const balance = shallowRef<number | null>(null)
const amount = shallowRef(0)
const loading = shallowRef(false)
const submitting = shallowRef(false)
const acceptedCoin = shallowRef(0)
let pendingKey = ''

const topCoin = computed(() => Number(current.value?.paidCoin || 0))
const minimum = computed(() => Number(current.value?.minimumBid || rules.value?.openingBid || 0))
const step = computed(() => Math.max(Number(rules.value?.minimumIncrement || 1), 1))
const minutes = computed(() => Math.round((rules.value?.entitlementSeconds || 900) / 60))
const tagTitle = computed(() => {
  const body = tag.value?.body.trim() || ''
  return body.startsWith('#') ? body : `# ${body}`
})
const alreadyTop = computed(() => Boolean(tag.value && current.value?.tagId === tag.value.id))

async function loadMarket() {
  balance.value = null
  const [market, wallet] = await Promise.all([getCurrentExposure(), getWalletBalance()])
  current.value = market
  balance.value = Number(wallet.spendable ?? wallet.available)
  amount.value = Math.max(amount.value, minimum.value)
}

async function load() {
  loading.value = true
  amount.value = 0
  pendingKey = ''
  try {
    const [r, mine] = await Promise.all([getExposureRules(), getMyTag(), loadMarket()])
    rules.value = r
    const own = mine.active
    tag.value = own ? { id: own.id, version: own.version, body: own.body } : null
    amount.value = minimum.value
  }
  catch { /* request() already toasts */ }
  finally { loading.value = false }
}

watch(() => props.visible, (open) => {
  if (!open) return
  phase.value = 'bid'
  load()
}, { immediate: true })

function decrease() { amount.value = Math.max(minimum.value, amount.value - step.value) }
function increase() { amount.value += step.value }
function onInput(event: Event) {
  const value = Number.parseInt((event as unknown as { detail: { value: string } }).detail.value, 10)
  amount.value = Number.isFinite(value) ? value : 0
}
function onBlur() { if (amount.value < minimum.value) amount.value = minimum.value }

function toast(title: string) { uni.showToast({ title, icon: 'none' }) }

function openWallet() {
  emit('close')
  uni.navigateTo({ url: '/pages/wallet/index' })
}
function openComposer() {
  emit('close')
  uni.navigateTo({ url: '/pages/tag/compose?edit=1' })
}

async function submit() {
  if (submitting.value || loading.value) return
  if (!tag.value) return openComposer()
  if (alreadyTop.value) return toast('你的 Tag 已是当前榜首')
  if (amount.value < minimum.value) {
    amount.value = minimum.value
    return toast(`最低出价 ${minimum.value} 星币`)
  }
  if (balance.value === null) return toast('余额尚未加载，请重试')
  if (amount.value > balance.value) return toast('星币不足，先去获取一些吧')

  submitting.value = true
  pendingKey ||= `exposure-${Date.now()}-${Math.random().toString(16).slice(2)}`
  try {
    const result = await createExposureBid({ tagId: tag.value.id, tagVersion: tag.value.version, offeredCoin: String(amount.value) }, pendingKey, true)
    pendingKey = ''
    acceptedCoin.value = Number(result.paidCoin || result.offeredCoin || amount.value)
    phase.value = 'success'
    emit('success')
  }
  catch (cause) {
    const code = cause instanceof ApiError ? cause.code : ''
    if (code !== 'NETWORK_ERROR') pendingKey = ''
    if (code === 'BID_TOO_LOW') {
      amount.value = 0
      await loadMarket().catch(() => {})
      phase.value = 'outbid'
    }
    else if (code === 'INSUFFICIENT_BALANCE') {
      toast('星币不足，先去获取一些吧')
      loadMarket().catch(() => {})
    }
    else if (code === 'ALREADY_TOP') toast('你的 Tag 已是当前榜首')
    else if (code === 'VERSION_CONFLICT') {
      toast('Tag 刚刚有更新，请重新提交')
      load()
    }
    else if (code === 'RATE_LIMITED') toast('操作太频繁，稍后再试')
    else toast(cause instanceof Error ? cause.message : '出价失败，请稍后再试')
  }
  finally { submitting.value = false }
}
</script>

<template>
  <view class="bid" :class="[{ 'bid--open': visible }, `bid--${phase}`]" :aria-hidden="!visible">
    <view class="bid__mask" @click="emit('close')" @touchmove.stop.prevent />

    <view v-if="phase === 'bid'" class="bid__sheet" role="dialog" aria-label="参与置顶">
      <view class="bid__grabber" />
      <button class="bid__close" aria-label="关闭" @click="emit('close')" />

      <view class="bid__head">
        <image class="bid__gavel" src="/static/stickers/gavel.png" mode="aspectFit" aria-hidden="true" />
        <view class="bid__titles">
          <text class="bid__title">参与置顶</text>
          <text class="bid__subtitle">让你的 Tag 被更多人看见。</text>
        </view>
        <text class="bid__note">好的相遇\n从勇敢表达开始</text>
        <image class="bid__cat" src="/static/illustrations/header-cat.png" mode="aspectFit" aria-hidden="true" />
      </view>

      <view class="bid__mytag">
        <text class="bid__mytag-label">我的 Tag</text>
        <text v-if="tag" class="bid__mytag-body">{{ tagTitle }}</text>
        <text v-else class="bid__mytag-empty">{{ loading ? '加载中…' : '还没有发布中的 Tag' }}</text>
      </view>

      <view class="bid__market">
        <view class="bid__prices">
          <view class="bid__price">
            <text class="bid__price-label">当前榜首</text>
            <view class="bid__price-value"><image src="/static/stickers/coin.png" mode="aspectFit" /><text>{{ topCoin || '暂无' }}</text></view>
          </view>
          <view class="bid__price-divider" />
          <view class="bid__price">
            <text class="bid__price-label">最低出价</text>
            <view class="bid__price-value"><image src="/static/stickers/coin.png" mode="aspectFit" /><text>{{ minimum || '—' }}</text></view>
          </view>
        </view>
        <view class="bid__sticky"><text>让更多同频的人\n看到你的想法\n一起相遇</text></view>
      </view>

      <view class="bid__stepper-card">
        <view class="bid__stepper-row">
          <view class="bid__spark bid__spark--left"><i /><i /><i /></view>
          <view class="bid__stepper">
            <button class="bid__step" aria-label="减少" :disabled="amount <= minimum" @click="decrease"><i class="bid__minus" /></button>
            <view class="bid__amount">
              <image src="/static/stickers/coin.png" mode="aspectFit" />
              <input :value="String(amount)" type="number" aria-label="出价星币" @input="onInput" @blur="onBlur">
            </view>
            <button class="bid__step" aria-label="增加" @click="increase"><i class="bid__minus bid__plus" /></button>
          </view>
          <view class="bid__spark bid__spark--right"><i /><i /><i /></view>
        </view>
        <view class="bid__wallet">
          <text>我的星币：</text>
          <image src="/static/stickers/coin.png" mode="aspectFit" />
          <text class="bid__wallet-value">{{ balance ?? '—' }}</text>
          <button v-if="balance === null && !loading" @click="load">重试</button>
          <text class="bid__wallet-link" @click="openWallet">去获取星币</text>
        </view>
      </view>

      <button class="bid__cta" :loading="submitting" :disabled="loading || alreadyTop || balance === null" @click="submit">
        <image class="bid__cta-leaf bid__cta-leaf--left" src="/static/decor/leaf-sprig.png" mode="aspectFit" aria-hidden="true" />
        <view class="bid__spark bid__spark--light"><i /><i /><i /></view>
        <text>{{ !tag && !loading ? '先去发布 Tag' : alreadyTop ? '已是当前榜首' : '参与置顶' }}</text>
        <view class="bid__spark bid__spark--light bid__spark--flip"><i /><i /><i /></view>
        <image class="bid__cta-leaf bid__cta-leaf--right" src="/static/decor/leaf-branch.png" mode="aspectFit" aria-hidden="true" />
      </button>

      <text class="bid__rules">首次参与最低 {{ rules?.openingBid || '—' }} 星币，每次加价不得低于 {{ step }} 星币\n一次置顶最长 {{ minutes }} 分钟，被超过后将进入轮播置顶</text>
    </view>

    <view v-else-if="phase === 'success'" class="bid__modal" role="dialog" aria-label="置顶成功">
      <button class="bid__close" aria-label="关闭" @click="emit('close')" />
      <view class="bid__modal-head">
        <view class="bid__crown" aria-hidden="true" />
        <view class="bid__titles">
          <text class="bid__title">置顶成功</text>
          <text class="bid__modal-lead">你的 Tag 已成为当前榜首！</text>
          <text class="bid__subtitle">接下来，会有更多人先看到你的想法。</text>
        </view>
      </view>
      <view class="bid__success-body">
        <view class="bid__success-cat">
          <image src="/static/illustrations/cat-lying.png" mode="aspectFit" aria-hidden="true" />
          <text>好的想法\n值得被更多人看到</text>
        </view>
        <view class="bid__success-facts">
          <view class="bid__fact bid__fact--blue">
            <image src="/static/stickers/coin.png" mode="aspectFit" />
            <view><text>本次出价</text><b>{{ acceptedCoin }}</b></view>
          </view>
          <view class="bid__fact bid__fact--yellow">
            <view class="bid__clock" />
            <view><text>置顶时长</text><b>最长 {{ minutes }} 分钟</b></view>
          </view>
        </view>
      </view>
      <button class="bid__cta bid__cta--compact" @click="emit('close')"><text>知道了</text></button>
    </view>

    <view v-else class="bid__modal" role="dialog" aria-label="出价已更新">
      <button class="bid__close" aria-label="关闭" @click="emit('close')" />
      <view class="bid__modal-head">
        <image class="bid__outbid-cat" src="/static/illustrations/cat-lying.png" mode="aspectFit" aria-hidden="true" />
        <view class="bid__titles">
          <text class="bid__title">出价已更新</text>
          <text class="bid__subtitle">刚刚有人出了更高的价格，\n重新出价就可以继续参与。</text>
        </view>
      </view>
      <view class="bid__prices bid__prices--modal">
        <view class="bid__price">
          <text class="bid__price-label">当前榜首</text>
          <view class="bid__price-value"><image src="/static/stickers/coin.png" mode="aspectFit" /><text>{{ topCoin || '暂无' }}</text></view>
        </view>
        <view class="bid__price-divider" />
        <view class="bid__price">
          <text class="bid__price-label">最低出价</text>
          <view class="bid__price-value"><image src="/static/stickers/coin.png" mode="aspectFit" /><text>{{ minimum || '—' }}</text></view>
        </view>
      </view>
      <view class="bid__stepper-row">
        <view class="bid__spark bid__spark--left"><i /><i /><i /></view>
        <view class="bid__stepper">
          <button class="bid__step" aria-label="减少" :disabled="amount <= minimum" @click="decrease"><i class="bid__minus" /></button>
          <view class="bid__amount">
            <image src="/static/stickers/coin.png" mode="aspectFit" />
            <input :value="String(amount)" type="number" aria-label="出价星币" @input="onInput" @blur="onBlur">
          </view>
          <button class="bid__step" aria-label="增加" @click="increase"><i class="bid__minus bid__plus" /></button>
        </view>
        <view class="bid__spark bid__spark--right"><i /><i /><i /></view>
      </view>
      <view class="bid__wallet">
        <text>我的星币：</text>
        <image src="/static/stickers/coin.png" mode="aspectFit" />
        <text class="bid__wallet-value">{{ balance ?? '—' }}</text>
          <button v-if="balance === null && !loading" @click="load">重试</button>
        <text class="bid__wallet-link" @click="openWallet">去获取星币</text>
      </view>
      <view class="bid__modal-actions">
        <button class="bid__ghost" @click="emit('close')">暂不参与</button>
        <button class="bid__cta bid__cta--compact" :loading="submitting" :disabled="loading || balance === null" @click="submit"><text>重新出价</text></button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$paper: #fbf8ef;
$ink: #20584f;
$text: #23291f;
$muted: #7b7f76;

.bid { position:fixed; z-index:110; inset:0; visibility:hidden; pointer-events:none; transition:visibility 0s linear .28s; }
.bid--open { visibility:visible; pointer-events:auto; transition-delay:0s; }
.bid__mask { position:absolute; inset:0; background:rgba(28,36,30,.45); opacity:0; transition:opacity .28s ease; }
.bid--open .bid__mask { opacity:1; }
button::after { border:0; }

.bid__sheet {
  position:absolute; right:0; bottom:0; left:0;
  max-width:560px; max-height:92vh; margin:0 auto;
  padding:10px 16px calc(12px + env(safe-area-inset-bottom));
  overflow:hidden auto; box-sizing:border-box;
  border-radius:26px 26px 0 0; background:$paper; box-shadow:0 -8px 24px rgba(28,36,30,.14);
  transform:translateY(104%); transition:transform .3s cubic-bezier(.2,.8,.2,1);
}
.bid--open .bid__sheet { transform:translateY(0); }
.bid__grabber { width:44px; height:5px; margin:0 auto 6px; border-radius:999px; background:#d7d9d2; }

.bid__close { position:absolute; z-index:3; top:18px; right:16px; width:34px; height:34px; padding:0; border-radius:50%; background:#e3f0ea; }
.bid__close::before { content:''; position:absolute; inset:0; background:linear-gradient($ink,$ink) center / 16px 2px no-repeat, linear-gradient($ink,$ink) center / 2px 16px no-repeat; transform:rotate(45deg); }

.bid__head { position:relative; display:flex; min-height:112px; align-items:center; padding-right:120px; }
.bid__gavel { position:relative; width:74px; height:74px; flex:none; margin-left:-6px; }
.bid__head::before { content:''; position:absolute; top:22px; left:-4px; width:92px; height:62px; border-radius:40% 55% 45% 60%; background:#f8e7a4; transform:rotate(-12deg); opacity:.8; }
.bid__titles { position:relative; display:flex; min-width:0; flex-direction:column; }
.bid__title { color:$text; font-size:28px; font-weight:900; letter-spacing:2px; line-height:1.2; }
.bid__subtitle { margin-top:4px; color:$muted; font-size:13px; letter-spacing:1px; line-height:1.5; white-space:pre-line; }
.bid__note { position:absolute; top:26px; right:62px; color:$muted; font-size:11px; line-height:1.5; white-space:pre-line; transform:rotate(-10deg); }
.bid__cat { position:absolute; right:-16px; bottom:-10px; width:132px; height:74px; }

.bid__mytag { display:flex; align-items:center; gap:12px; margin-top:8px; padding:12px 14px; border-radius:12px 16px 12px 14px; background:#eef6ec; box-shadow:0 2px 8px rgba(39,68,56,.07); }
.bid__mytag-label { flex:none; color:$text; font-size:14px; font-weight:800; }
.bid__mytag-body { min-width:0; overflow:hidden; padding:6px 12px; border-radius:10px; background:#fbe8a3; color:$text; font-size:14px; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
.bid__mytag-empty { color:$muted; font-size:13px; }

.bid__market { position:relative; margin-top:12px; padding-right:96px; }
.bid__prices { display:flex; align-items:stretch; padding:14px 16px; border-radius:10px 14px 12px 8px; background:#dcebf6; box-shadow:0 2px 8px rgba(62,104,138,.1); }
.bid__price { display:flex; min-width:0; flex:1; flex-direction:column; gap:8px; }
.bid__price-label { color:$text; font-size:13px; font-weight:700; }
.bid__price-value { display:flex; align-items:center; gap:8px; color:$text; font-size:24px; font-weight:900; }
.bid__price-value image { width:30px; height:30px; flex:none; }
.bid__price-divider { width:1px; margin:4px 14px; background:rgba(32,88,79,.2); }
.bid__sticky { position:absolute; top:-4px; right:-4px; display:flex; width:104px; height:96px; align-items:center; justify-content:center; background:#fbeec0; box-shadow:0 3px 8px rgba(120,92,20,.14); transform:rotate(-5deg); }
.bid__sticky text { color:#5f6358; font-size:11px; line-height:1.5; text-align:center; white-space:pre-line; }

.bid__stepper-card { margin-top:12px; padding:14px 12px 12px; border-radius:14px; background:rgba(255,255,255,.8); box-shadow:0 2px 8px rgba(39,68,56,.06); }
.bid__stepper-row { display:flex; align-items:center; justify-content:center; gap:10px; }
.bid__stepper { display:flex; align-items:center; gap:10px; padding:6px; border-radius:999px; background:#eef2ec; }
.bid__step { position:relative; display:grid; width:46px; height:46px; padding:0; place-items:center; border:2px solid #9cc5b6; border-radius:50%; background:#fff; }
.bid__step[disabled] { opacity:.45; }
.bid__minus { position:relative; display:block; width:16px; height:2px; border-radius:2px; background:$ink; }
.bid__plus::after { content:''; position:absolute; top:-7px; left:7px; width:2px; height:16px; border-radius:2px; background:$ink; }
.bid__amount { display:flex; width:110px; align-items:center; justify-content:center; gap:6px; }
.bid__amount image { width:30px; height:30px; flex:none; }
.bid__amount input { width:64px; height:36px; color:$text; font-size:26px; font-weight:900; }

.bid__spark { position:relative; width:14px; height:22px; flex:none; }
.bid__spark i { position:absolute; width:4px; border-radius:4px; background:#f3c83f; }
.bid__spark i:nth-child(1) { top:0; left:6px; height:8px; transform:rotate(-20deg); }
.bid__spark i:nth-child(2) { top:8px; left:0; height:6px; transform:rotate(-70deg); }
.bid__spark i:nth-child(3) { top:14px; left:6px; height:8px; transform:rotate(-140deg); }
.bid__spark--right, .bid__spark--flip { transform:scaleX(-1); }

.bid__wallet { display:flex; align-items:center; gap:4px; margin-top:12px; padding:0 8px; color:$text; font-size:13px; font-weight:700; }
.bid__wallet image { width:20px; height:20px; }
.bid__wallet-value { font-size:15px; font-weight:900; }
.bid__wallet-link { margin-left:auto; color:$ink; font-size:13px; }
.bid__wallet-link::after { content:''; display:inline-block; width:6px; height:6px; margin-left:6px; border-top:2px solid $ink; border-right:2px solid $ink; transform:rotate(45deg) translateY(-1px); }

.bid__cta {
  position:relative; display:flex; width:100%; height:58px; margin-top:14px; align-items:center; justify-content:center; gap:14px;
  overflow:hidden; color:#fff; border-radius:999px; background:linear-gradient(180deg,#2f6f5f,#1f5a4c);
  box-shadow:0 6px 14px rgba(32,88,79,.22); font-size:22px; font-weight:900; letter-spacing:4px; line-height:58px;
}
.bid__cta[disabled] { opacity:.6; }
.bid__cta:active { transform:translateY(1px) scale(.99); }
.bid__cta > text { position:relative; z-index:1; }
.bid__cta-leaf { position:absolute; top:-6px; width:64px; height:70px; opacity:.35; }
.bid__cta-leaf--left { left:14px; transform:rotate(-60deg); }
.bid__cta-leaf--right { right:14px; transform:rotate(80deg) scaleX(-1); }
.bid__spark--light i { background:#f6d66a; }
.bid__rules { display:block; margin-top:12px; color:#8a8d85; font-size:11px; line-height:1.7; text-align:center; white-space:pre-line; }

.bid__modal {
  position:absolute; top:50%; left:50%; width:calc(100% - 48px); max-width:400px;
  padding:22px 18px 18px; box-sizing:border-box;
  border-radius:22px 18px 24px 20px; background:$paper; box-shadow:0 10px 30px rgba(28,36,30,.22);
  transform:translate(-50%,-46%) scale(.96); opacity:0; transition:transform .25s ease, opacity .25s ease;
}
.bid--open .bid__modal { transform:translate(-50%,-50%); opacity:1; }
.bid__modal .bid__close { top:12px; right:12px; width:30px; height:30px; }
.bid__modal-head { display:flex; align-items:center; gap:12px; padding-right:24px; }
.bid__modal-lead { margin-top:6px; color:$ink; font-size:15px; font-weight:800; }
.bid__crown { width:64px; height:50px; flex:none; background:linear-gradient(180deg,#f8d766,#eab52c); clip-path:polygon(0 25%,22% 55%,38% 0,54% 55%,78% 6%,100% 34%,88% 100%,10% 100%); filter:drop-shadow(0 2px 2px rgba(120,90,20,.25)); }
.bid__success-body { display:flex; align-items:center; gap:10px; margin-top:14px; }
.bid__success-cat { display:flex; width:40%; flex:none; flex-direction:column; align-items:center; }
.bid__success-cat image { width:100%; height:80px; }
.bid__success-cat text { margin-top:6px; color:$muted; font-size:12px; line-height:1.5; text-align:center; white-space:pre-line; transform:rotate(-4deg); }
.bid__success-facts { display:flex; min-width:0; flex:1; flex-direction:column; gap:8px; }
.bid__fact { display:flex; align-items:center; gap:8px; padding:12px 10px; border-radius:10px 12px 8px 12px; }
.bid__fact view { display:flex; flex-direction:column; gap:2px; }
.bid__fact text { color:$text; font-size:12px; font-weight:700; }
.bid__fact b { color:$text; font-size:17px; font-weight:900; white-space:nowrap; }
.bid__fact image { width:32px; height:32px; flex:none; }
.bid__fact--blue { background:#dcebf6; }
.bid__fact--yellow { background:#fbeec0; }
.bid__clock { position:relative; width:26px; height:26px; flex:none; margin:0 3px; border:2.5px solid $text; border-radius:50%; box-sizing:border-box; }
.bid__clock::before { content:''; position:absolute; top:4px; left:9px; width:2.5px; height:8px; border-radius:2px; background:$text; }
.bid__clock::after { content:''; position:absolute; top:10px; left:10px; width:6px; height:2.5px; border-radius:2px; background:$text; }
.bid__cta--compact { height:50px; margin-top:16px; font-size:19px; line-height:50px; }
.bid__outbid-cat { width:96px; height:60px; flex:none; }
.bid__prices--modal { margin:14px 0 12px; }
.bid__modal .bid__stepper-row { margin-top:4px; }
.bid__modal-actions { display:flex; gap:12px; }
.bid__modal-actions > button { flex:1; }
.bid__ghost { height:50px; margin-top:16px; color:$ink; border:2px solid #9cc5b6; border-radius:999px; background:#fff; font-size:17px; font-weight:800; line-height:46px; }

@media (max-width:380px) {
  .bid__head { padding-right:96px; }
  .bid__title { font-size:24px; }
  .bid__cat { width:108px; }
  .bid__note { right:44px; font-size:10px; }
  .bid__market { padding-right:84px; }
  .bid__sticky { width:92px; }
  .bid__price-value { font-size:20px; }
  .bid__step { width:40px; height:40px; }
}
</style>
