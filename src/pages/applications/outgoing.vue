<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'
import { ApplicationCard, AppHeader, AppTabBar } from '@/components/business'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useApplicationsData } from '@/composables/useApplicationsData'
import { goBack } from '@/utils/navigation'

const { outgoing, loading, outgoingError, load } = useApplicationsData()
const pending = computed(() => outgoing.value.filter(item => item.state === 'PENDING').length)

function openDetail(id: string) { uni.navigateTo({ url: `/pages/tag/compare?id=${encodeURIComponent(id)}` }) }
function openChat(id: string) { uni.navigateTo({ url: `/pages/chat/index?id=${encodeURIComponent(id)}` }) }

onShow(load)
</script>

<template>
  <view class="tago-page applications-page">
    <AppHeader variant="home" back title="我发出的申请" subtitle="看看哪些回答，还在等对方回应" slogan="每一次真诚回应\n都可能带来新的相遇" @back="goBack" />
    <AsyncState :loading="loading" :error="outgoingError" :empty="!outgoing.length" empty-title="还没有发出认识申请" empty-description="在发现页遇到感兴趣的 Tag，认真回答三问后会出现在这里。" @retry="load">
      <template #empty-icon><image class="applications-empty-icon" src="/static/illustrations/meet-seedling.png" mode="aspectFit" aria-hidden="true" /></template>
      <view class="applications-summary">
        <view class="applications-summary__tape applications-summary__tape--tl" aria-hidden="true" />
        <view class="applications-summary__tape applications-summary__tape--br" aria-hidden="true" />
        <view class="applications-summary__envelope" aria-hidden="true">
          <image src="/static/illustrations/meet-seedling.png" mode="aspectFit" />
        </view>
        <view class="applications-summary__copy">
          <view v-if="pending" class="applications-summary__title"><text>你有</text><text class="applications-summary__count">{{ pending }}</text><text>个还在等待</text></view>
          <view v-else class="applications-summary__title"><text>这些申请都有结果了</text></view>
          <text class="applications-summary__hint">{{ pending ? '对方看到你的回答后，会决定要不要认识你～' : '点开可以回看当时写下的回答' }}</text>
        </view>
        <view class="applications-summary__note"><text>慢慢等，</text><text>真诚的回答会被看见 ♡</text></view>
      </view>
      <view class="applications-list"><ApplicationCard v-for="application in outgoing" :key="application.id" :application="application" @detail="openDetail" @chat="openChat" /></view>
    </AsyncState>
    <AppTabBar active="meet" />
  </view>
</template>

<style scoped lang="scss">
.applications-page { display:flex; min-height:100dvh; flex-direction:column; overflow-x:hidden; }
.applications-empty-icon { width:112rpx; height:112rpx; flex:none; margin-bottom:24rpx; }
.applications-list { display:flex; flex-direction:column; }
.applications-list :deep(.application:last-child) { margin-bottom:0; }

.applications-summary { position:relative; display:flex; align-items:center; gap:16rpx; margin:6rpx 4rpx 30rpx; padding:18rpx 22rpx 18rpx 18rpx; border-radius:6rpx; background:linear-gradient(100deg,#e7f3df,#dceccf 60%,#d4e6c6); box-shadow:0 6rpx 16rpx rgba(70,110,60,.1); }
.applications-summary__tape { position:absolute; width:48rpx; height:18rpx; background:rgba(176,206,150,.7); pointer-events:none; }
.applications-summary__tape--tl { top:-6rpx; left:-14rpx; transform:rotate(-36deg); }
.applications-summary__tape--br { right:-14rpx; bottom:-4rpx; transform:rotate(-36deg); }
.applications-summary__envelope { position:relative; width:84rpx; height:70rpx; flex:none; }
.applications-summary__envelope image { width:100%; height:100%; }
.applications-summary__badge { position:absolute; top:-8rpx; right:-6rpx; display:grid; box-sizing:border-box; min-width:34rpx; height:34rpx; padding:0 6rpx; place-items:center; color:#fff; border:2rpx solid #fff; border-radius:999rpx; background:var(--tago-danger); font-size:18rpx; font-weight:850; line-height:1; }
.applications-summary__copy { display:flex; min-width:0; flex:1; flex-direction:column; gap:8rpx; }
.applications-summary__title { display:flex; align-items:baseline; gap:8rpx; color:var(--tago-ink); font-size:27rpx; font-weight:850; white-space:nowrap; }
.applications-summary__count { color:var(--tago-primary); font-size:36rpx; font-weight:900; line-height:1; }
.applications-summary__hint { overflow:hidden; color:#5d6660; font-size:18rpx; text-overflow:ellipsis; white-space:nowrap; }
.applications-summary__note { display:flex; flex:none; flex-direction:column; padding-left:16rpx; color:#4f5a52; border-left:1rpx dashed rgba(32,88,79,.2); font-size:18rpx; line-height:1.4; transform:rotate(-2deg); }

.applications-page :deep(.header--home) { min-height:200rpx; }
.applications-page :deep(.header--home .header__brand) { position:relative; margin-bottom:10rpx; }
.applications-page :deep(.header--home .header__logo) { width:260rpx; height:88rpx; }
.applications-page :deep(.header--home .header__title) { max-width:400rpx; font-size:46rpx; letter-spacing:3rpx; }
.applications-page :deep(.header--home .header__subtitle) { color:#4d6478; font-size:22rpx; }
.applications-page :deep(.header--home .header__slogan) { position:absolute; top:40rpx; right:-150rpx; display:block; width:200rpx; font-size:18rpx; text-align:left; }
.applications-page :deep(.header--home .header__cat-art) { right:-20rpx; width:280rpx; height:172rpx; }
.applications-page :deep(.header--home .header__copy) { padding-left:52rpx; }
</style>
