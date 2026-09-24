<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, shallowRef } from 'vue'
import type { TagDto } from '@/api/social'
import { getPublicTag } from '@/api/social'
import { getProfile } from '@/api/account'
import AppHeader from '@/components/business/AppHeader.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import ExposureBidSheet from '@/components/business/ExposureBidSheet.vue'
import { goBack } from '@/utils/navigation'

const tag = shallowRef<TagDto | null>(null)
const myPublicId = shallowRef('')
const pinned = shallowRef(false)
const loading = shallowRef(true)
const error = shallowRef('')
const isMine = computed(() => Boolean(tag.value && tag.value.ownerIdentity.publicId === myPublicId.value))

async function load(id: string) {
  loading.value = true
  error.value = ''
  try {
    const [detail, profile] = await Promise.all([getPublicTag(id), getProfile()])
    tag.value = detail
    myPublicId.value = profile.publicId
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Tag 加载失败' }
  finally { loading.value = false }
}

const bidOpen = shallowRef(false)
function openBid() { bidOpen.value = true }
function openApplication() {
  if (tag.value && !isMine.value) uni.navigateTo({ url: `/pages/tag/respond?id=${encodeURIComponent(tag.value.id)}` })
}

onLoad(query => {
  const id = typeof query?.id === 'string' ? query.id : ''
  pinned.value = query?.pinned === '1'
  if (id) load(id)
  else { loading.value = false; error.value = '缺少 Tag ID' }
})
</script>

<template>
  <view class="tago-page tag-detail">
    <AppHeader back title="Tag 详情" subtitle="看看这段认真写下的期待" @back="goBack" />
    <AsyncState :loading="loading" :error="error" :empty="!tag" empty-title="没有找到这个 Tag" @retry="tag && load(tag.id)">
      <view v-if="tag" class="paper">
        <text class="owner">{{ tag.ownerIdentity.displayName }} · @{{ tag.ownerIdentity.publicId }}</text>
        <text class="title"># {{ tag.body }}</text>
        <view v-for="question in tag.questions.filter(item => item.generated && item.text)" :key="question.slot" class="question">
          <b>Q{{ question.slot }} {{ question.text }}</b>
          <text>{{ tag.publisherAnswers.find(answer => answer.slot === question.slot)?.text || '—' }}</text>
        </view>
      </view>
      <view v-if="tag" class="actions">
        <button v-if="pinned" @click="openBid">竞拍置顶</button>
        <button v-if="!isMine" @click="openApplication">想认识 TA</button>
      </view>
    </AsyncState>
    <ExposureBidSheet :visible="bidOpen" @close="bidOpen = false" />
  </view>
</template>

<style scoped lang="scss">
.tag-detail { min-height:100dvh; }
.paper { padding:32rpx; border-radius:24rpx; background:var(--tago-paper-white); box-shadow:var(--tago-shadow); }
.owner { display:block; color:var(--tago-muted); font-size:22rpx; }
.title { display:block; margin:22rpx 0; font-size:34rpx; font-weight:850; line-height:1.5; }
.question { display:flex; flex-direction:column; gap:8rpx; padding:18rpx 0; border-top:1rpx solid var(--tago-line); font-size:23rpx; }
.question text { color:var(--tago-muted); }
.actions { display:flex; gap:16rpx; margin-top:24rpx; }
.actions button { flex:1; color:white; border-radius:999rpx; background:var(--tago-primary); font-size:23rpx; }
</style>
