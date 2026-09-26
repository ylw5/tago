<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ApplicationCard, AppHeader, AppTabBar } from '@/components/business'
import AsyncState from '@/components/ui/AsyncState.vue'
import { useApplicationsData } from '@/composables/useApplicationsData'
import { goBack } from '@/utils/navigation'

const { applications, loading, error, load, accept, decline } = useApplicationsData()

function openDetail(id: string) { uni.navigateTo({ url: `/pages/tag/compare?id=${encodeURIComponent(id)}` }) }
async function handleAccept(id: string) {
  const acceptance = await accept(id)
  uni.showToast({ title: '已接受，正在创建会话', icon: 'none' })
  setTimeout(() => uni.navigateTo({ url: `/pages/chat/index?id=${encodeURIComponent(acceptance?.conversationId ?? id)}` }), 350)
}
async function handleDecline(id: string) {
  await decline(id)
  uni.showToast({ title: '申请已归档', icon: 'none' })
}

onShow(load)
</script>

<template>
  <view class="tago-page applications-page">
    <AppHeader variant="home" back title="有人想认识你" subtitle="看看哪些连接，正准备向你走来" slogan="每一次新的相遇\n都是生活送来的礼物" @back="goBack" />
    <AsyncState :loading="loading" :error="error" :empty="!applications.length" empty-title="暂时没有新申请" empty-description="有人认真回应你的 Tag 后，会出现在这里。" @retry="load">
      <template #empty-icon><image class="applications-empty-icon" src="/static/illustrations/recognition-envelope.png" mode="aspectFit" aria-hidden="true" /></template>
      <view class="applications-summary">
        <view class="applications-summary__tape applications-summary__tape--tl" aria-hidden="true" />
        <view class="applications-summary__tape applications-summary__tape--br" aria-hidden="true" />
        <view class="applications-summary__envelope" aria-hidden="true">
          <image src="/static/illustrations/recognition-envelope.png" mode="aspectFit" />
          <text class="applications-summary__badge">{{ applications.length }}</text>
        </view>
        <view class="applications-summary__copy">
          <view class="applications-summary__title"><text>你有</text><text class="applications-summary__count">{{ applications.length }}</text><text>个新的认识申请</text></view>
          <text class="applications-summary__hint">不同的兴趣与故事，正在期待你的回应～</text>
        </view>
        <view class="applications-summary__note"><text>慢慢看，</text><text>总会遇到对的人 ♡</text></view>
      </view>
      <view class="applications-list"><ApplicationCard v-for="application in applications" :key="application.id" :application="application" @detail="openDetail" @accept="handleAccept" @decline="handleDecline" /></view>
    </AsyncState>
    <AppTabBar active="meet" />
  </view>
</template>

<style scoped lang="scss">
.applications-page { display:flex; min-height:100dvh; flex-direction:column; overflow-x:hidden; }
.applications-empty-icon { width:112rpx; height:112rpx; flex:none; margin-bottom:24rpx; }
.applications-list { display:flex; flex-direction:column; }
.applications-list :deep(.application:last-child) { margin-bottom:0; }

.applications-summary { position:relative; display:flex; align-items:center; gap:16rpx; margin:6rpx 4rpx 30rpx; padding:18rpx 22rpx 18rpx 18rpx; border-radius:6rpx; background:linear-gradient(100deg,#fcf0c6,#f9ecc4 60%,#f7e8bd); box-shadow:0 6rpx 16rpx rgba(120,98,40,.12); }
.applications-summary__tape { position:absolute; width:48rpx; height:18rpx; background:rgba(236,205,120,.6); pointer-events:none; }
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
