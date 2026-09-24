<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, shallowRef } from 'vue'
import type { components } from '@/api/types/generated'
import { getWalletBalance, listWalletEntries } from '@/api/wallet'
import AppHeader from '@/components/business/AppHeader.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { goBack } from '@/utils/navigation'
type Balance=components['schemas']['WalletBalance'];type Entry=components['schemas']['WalletEntry']
const balance=shallowRef<Balance|null>(null),entries=shallowRef<Entry[]>([]),filter=shallowRef<'all'|'income'|'expense'>('all'),loading=shallowRef(false),error=shallowRef('')
const visible=computed(()=>entries.value.filter(item=>filter.value==='all'||(filter.value==='income'?Number(item.delta)>0:Number(item.delta)<0)))
function formatTime(value?:string|null){if(!value)return'';const time=dayjs(value);return time.isValid()?time.format('MM-DD HH:mm'):value}
const sourceLabels:Record<string,string>={EXPOSURE_BID:'为一次认真相遇加油',ADMIN_ADJUSTMENT:'收到一份特别补给',SIGNUP_BONUS:'初次见面的礼物',GIFT:'一份被记住的心意',REFUND:'回到口袋里的小惊喜'}
const stickers=['/static/stickers/sticker-book.png','/static/stickers/sticker-moon.png','/static/stickers/sticker-camera.png','/static/stickers/sticker-gamepad.png','/static/stickers/sticker-shoes.png']
function entryTitle(entry:Entry){return sourceLabels[entry.sourceType]||entry.sourceType.replaceAll('_',' ').toLowerCase()}
function entryStory(entry:Entry){const amount=Math.abs(Number(entry.delta));return Number(entry.delta)>=0?`这一次收下了 ${amount} 枚 T 币，让故事继续往前。`:`这一次花出 ${amount} 枚 T 币，替期待多争取一点被看见。`}
async function load(){loading.value=true;error.value='';try{[balance.value,entries.value]=await Promise.all([getWalletBalance(),listWalletEntries({limit:50})])}catch(cause){error.value=cause instanceof Error?cause.message:'钱包记录加载失败'}finally{loading.value=false}}
onShow(load)
onLoad(query=>{if(query?.filter==='income'||query?.filter==='expense')filter.value=query.filter})
</script>
<template>
  <view class="tago-page tago-page--detail wallet-page">
    <AppHeader back title="礼物路书" subtitle="每一枚 T 币，都记着一次抵达" @back="goBack" />
    <AsyncState :loading="loading" :error="error" @retry="load">
      <view class="balance-paper">
        <view><text>此刻拥有</text><b>{{ balance?.available ?? '—' }}</b><small>枚 T 币</small></view>
        <image src="/static/stickers/books.png" mode="aspectFit" />
        <text class="balance-paper__note">总额 {{ balance?.balance ?? '—' }} · 留存 {{ balance?.reserved ?? '—' }}</text>
      </view>
      <view class="chapter"><i /><view><b>我们的礼物路书</b><small>把相遇里发生过的流动，一页页收好</small></view><i /></view>
      <view class="filters"><button v-for="item in [{k:'all',l:'全部'},{k:'income',l:'收到'},{k:'expense',l:'送出'}]" :key="item.k" :class="{active:filter===item.k}" @click="filter=item.k as typeof filter">{{ item.l }}</button></view>
      <view v-if="visible.length" class="roadbook">
        <view class="roadbook__line" aria-hidden="true" />
        <article v-for="(entry,index) in visible" :key="entry.sequence" class="moment" :class="[{negative:Number(entry.delta)<0},`moment--${index%2?'right':'left'}`]">
          <view class="moment__pin"><i /></view>
          <view class="moment__paper">
            <view class="moment__month">{{ dayjs(entry.createdAt).format('MM') }}<small>月</small></view>
            <image :src="stickers[index%stickers.length]" mode="aspectFit" />
            <view class="moment__copy"><small>{{ formatTime(entry.createdAt) }}</small><b>{{ entryTitle(entry) }}</b><text>{{ entryStory(entry) }}</text><em>结余 {{ entry.balanceAfter }}</em></view>
            <strong>{{ Number(entry.delta)>0?'+':'' }}{{ entry.delta }}</strong>
          </view>
        </article>
      </view>
      <view v-else class="empty">这段路还没有留下新的礼物记录</view>
    </AsyncState>
  </view>
</template>
<style scoped lang="scss">
.wallet-page {
  overflow-x:hidden;
  background:
    repeating-linear-gradient(0deg, rgba(32,88,79,.022) 0 1px, transparent 1px 7px),
    linear-gradient(180deg, #f0f0e9 0%, #e9e8e1 100%);
}

.balance-paper {
  position: relative;
  display: flex;
  min-height: 220rpx;
  align-items:center;
  justify-content: space-between;
  padding: 32rpx 38rpx;
  border: 1rpx solid rgba(32,88,79,.11);
  border-radius: 18rpx 34rpx 16rpx 28rpx;
  background:
    repeating-linear-gradient(118deg, rgba(184,151,97,.045) 0 2px, transparent 2px 9px),
    linear-gradient(112deg, #f5efd6 0%, #eee8ca 58%, #e8e2c2 100%);
  box-shadow: 0 12rpx 28rpx rgba(69,72,61,.12);
  transform: rotate(-.45deg);
}
.balance-paper>view { display:flex; flex-direction:column; }
.balance-paper image { width:180rpx; height:148rpx; transform:rotate(4deg); }
.balance-paper__note { position:absolute; right:28rpx; bottom:18rpx; }

.balance-paper::before {
  content: '';
  position: absolute;
  top: 15rpx;
  right: 24rpx;
  width: 68rpx;
  height: 16rpx;
  border-radius: 0 0 4rpx 4rpx;
  background: rgba(255,252,240,.45);
  transform: rotate(-4deg);
}

.balance-paper text {
  color:#20584f;
  font-size:23rpx;
  font-weight:850;
}

.balance-paper b {
  margin:5rpx 0;
  color:#17453e;
  font-size:56rpx;
  letter-spacing:.5rpx;
}

.balance-paper small {
  color:rgba(40,54,46,.65);
  font-size:20rpx;
}

.filters {
  display:flex;
  gap:12rpx;
  margin:22rpx 0;
}

.filters button {
  height:56rpx;
  flex:1;
  color:var(--tago-primary);
  border:1rpx solid rgba(32,88,79,.17);
  border-radius:999rpx;
  background:rgba(255,252,244,.72);
  font-size:20rpx;
  line-height:54rpx;
}

.filters button::after { border:0; }
.filters .active { color:#fff; border-color:#20584f; background:#20584f; }

.chapter { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:15rpx; margin:30rpx 0 14rpx; text-align:center; }
.chapter i { height:1px; background:rgba(32,88,79,.18); }
.chapter view { display:flex; flex-direction:column; }
.chapter b { color:#24352f; font-size:28rpx; font-weight:900; letter-spacing:2rpx; }
.chapter small { margin-top:4rpx; color:#7b8078; font-size:16rpx; }
.roadbook { position:relative; padding:18rpx 0 55rpx; }
.roadbook__line { position:absolute; top:10rpx; bottom:15rpx; left:50%; width:3rpx; background:repeating-linear-gradient(to bottom,#89a69b 0 13rpx,transparent 13rpx 25rpx); opacity:.65; transform:translateX(-50%); }
.moment { position:relative; display:flex; width:50%; min-height:260rpx; padding:14rpx 30rpx 24rpx 0; }
.moment--right { margin-left:50%; padding-right:0; padding-left:30rpx; }
.moment__pin { position:absolute; z-index:2; top:44rpx; right:-12rpx; display:grid; width:24rpx; height:24rpx; place-items:center; border:5rpx solid #edf0e7; border-radius:50%; background:#d5ae40; box-shadow:0 0 0 2rpx #6f9186; }
.moment--right .moment__pin { right:auto; left:-12rpx; }
.moment__paper { position:relative; display:flex; width:100%; min-height:235rpx; flex-direction:column; padding:23rpx 20rpx 18rpx; border:1rpx solid rgba(32,88,79,.08); border-radius:17rpx 28rpx 14rpx 24rpx; background:linear-gradient(145deg,#f7f2dc,#eee9cf); box-shadow:0 8rpx 21rpx rgba(54,70,60,.1); transform:rotate(-1.2deg); }
.moment--right .moment__paper { background:linear-gradient(145deg,#e7f1e3,#dcebd8); transform:rotate(1.1deg); }
.moment:nth-child(4n) .moment__paper { background:linear-gradient(145deg,#e7f1f4,#d9e9ef); }
.moment__paper image { align-self:flex-end; width:92rpx; height:75rpx; margin:-8rpx -4rpx -12rpx 0; }
.moment__month { position:absolute; top:-13rpx; left:13rpx; padding:7rpx 13rpx; color:#254e46; background:#f3cd55; font-size:25rpx; font-weight:950; transform:rotate(-4deg); }
.moment__month small { margin-left:2rpx; font-size:14rpx; }
.moment__copy { display:flex; flex:1; flex-direction:column; }
.moment__copy small { color:#788078; font-size:15rpx; }
.moment__copy b { margin-top:5rpx; color:#1f2823; font-size:21rpx; line-height:1.4; }
.moment__copy text { margin-top:7rpx; color:#687169; font-size:17rpx; line-height:1.5; }
.moment__copy em { margin-top:auto; color:#829087; font-size:14rpx; font-style:normal; }
.moment__paper strong { position:absolute; right:14rpx; bottom:14rpx; color:#1e6155; font-size:25rpx; transform:rotate(-3deg); }
.moment.negative .moment__paper strong { color:#a65b50; }
.empty { padding:90rpx 20rpx; color:var(--tago-muted); text-align:center; }
@media(max-width:360px){.moment{min-height:285rpx;padding-right:22rpx}.moment--right{padding-right:0;padding-left:22rpx}.moment__paper{padding:24rpx 14rpx 16rpx}.moment__paper image{width:76rpx}}
</style>
