<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, shallowRef } from 'vue'
import type { TagDto } from '@/api/social'
import { getPublicTag } from '@/api/social'
import { getProfile } from '@/api/account'
import { durationLabel } from '@/api/adapters'
import AsyncState from '@/components/ui/AsyncState.vue'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import ExposureBidSheet from '@/components/business/ExposureBidSheet.vue'
import { goBack } from '@/utils/navigation'

const tag = shallowRef<TagDto | null>(null)
const myPublicId = shallowRef('')
const pinned = shallowRef(false)
const loading = shallowRef(true)
const error = shallowRef('')
const isMine = computed(() => Boolean(tag.value && tag.value.ownerIdentity.publicId === myPublicId.value))
const questions = computed(() => (tag.value?.questions.filter(item => item.generated && item.text) || []).map(item => ({
  ...item,
  answer: tag.value?.publisherAnswers.find(answer => answer.slot === item.slot)?.text || '—',
})))
const encounterLabel = computed(() => {
  const mode = tag.value?.encounterMode
  return mode === 'ONLINE' ? '线上' : mode === 'OFFLINE' ? '线下' : '线上或线下'
})

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
  <view class="tago-page tago-page--detail detail-page">
    <view class="detail-head">
      <button class="detail-head__back" aria-label="返回" @click="goBack" />
      <view class="detail-head__brand">
        <image class="detail-head__logo" src="/static/illustrations/tago-wordmark.png" mode="aspectFit" aria-label="TAGO" />
        <view class="detail-head__spark" aria-hidden="true"><i /><i /><i /></view>
      </view>
      <text class="detail-head__title">Tag 详情</text>
      <text class="detail-head__subtitle">看看这段认真写下的期待~</text>
      <image class="detail-head__cat" src="/static/illustrations/drawer-cat.png" mode="aspectFit" aria-hidden="true" />
    </view>

    <AsyncState :loading="loading" :error="error" :empty="!tag" empty-title="没有找到这个 Tag" @retry="tag && load(tag.id)">
      <template v-if="tag">
        <view class="owner">
          <AvatarImage class="owner__avatar" :id="tag.ownerIdentity.avatarId" />
          <view class="owner__copy">
            <text class="owner__name">{{ tag.ownerIdentity.displayName }}</text>
            <text class="owner__id">@{{ tag.ownerIdentity.publicId }}</text>
          </view>
          <text v-if="pinned" class="owner__pinned">当前榜首</text>
        </view>

        <view class="topic">
          <text class="topic__tag"># {{ tag.body }}</text>
          <view class="topic__meta">
            <text>{{ encounterLabel }}</text>
            <text>{{ durationLabel(tag.duration) }}</text>
          </view>
          <image class="topic__cat" src="/static/illustrations/cat-lying.png" mode="aspectFit" aria-hidden="true" />
        </view>

        <view v-if="questions.length" class="qa-list">
          <view v-for="q in questions" :key="q.slot" class="qa-card" :class="`qa-card--${q.slot}`">
            <view class="qa-card__head">
              <text class="qa-card__slot">Q{{ q.slot }}</text>
              <text class="qa-card__question">{{ q.text }}</text>
            </view>
            <text class="qa-card__answer">{{ q.answer }}</text>
          </view>
        </view>
        <view v-else class="no-questions">这个 Tag 暂时还没有完整的问题</view>

        <view class="detail-foot">
          <image class="detail-foot__leaf" src="/static/decor/leaf-sprig.png" mode="aspectFit" aria-hidden="true" />
          <button v-if="pinned" class="bid-btn" @click="openBid">竞拍置顶</button>
          <view v-if="isMine" class="detail-foot__state">这是你发布的 Tag</view>
          <button v-else class="meet" @click="openApplication">想认识 TA</button>
        </view>
      </template>
    </AsyncState>
    <ExposureBidSheet :visible="bidOpen" @close="bidOpen = false" />
  </view>
</template>

<style scoped lang="scss">
$ink: #1f2b3b;
$muted: #56677d;

.detail-page {
  position: relative;
  overflow-x: hidden;
  padding-left: 16px;
  padding-right: 16px;
  background:
    radial-gradient(circle at 12% 4%, rgba(249, 231, 173, .3), transparent 28%),
    repeating-linear-gradient(0deg, rgba(32, 88, 79, .018) 0 1px, transparent 1px 8px),
    linear-gradient(180deg, #faf7ee 0%, #f5f1e4 100%);
}

.detail-head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 140px;
  padding: calc(14px + env(safe-area-inset-top)) 0 12px 26px;
}
.detail-head__back {
  position: absolute;
  top: calc(20px + env(safe-area-inset-top));
  left: -12px;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
}
.detail-head__back::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 17px;
  width: 11px;
  height: 11px;
  border-bottom: 2.5px solid #2b3a4f;
  border-left: 2.5px solid #2b3a4f;
  border-radius: 1px;
  transform: rotate(45deg);
}
.detail-head__back::after { border: 0; }
.detail-head__brand { position: relative; }
.detail-head__logo { display: block; width: 116px; height: 40px; }
.detail-head__spark { position: absolute; top: -4px; right: -24px; width: 22px; height: 26px; }
.detail-head__spark i { position: absolute; left: 0; width: 13px; height: 3px; border-radius: 3px; background: #f4c94c; transform-origin: left center; }
.detail-head__spark i:nth-child(1) { top: 3px; transform: rotate(-42deg); }
.detail-head__spark i:nth-child(2) { top: 12px; transform: rotate(-10deg); }
.detail-head__spark i:nth-child(3) { top: 21px; transform: rotate(22deg); }
.detail-head__title {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  padding: 0 4px;
  color: $ink;
  font-size: 27px;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1.3;
  background: linear-gradient(transparent 62%, rgba(244, 201, 76, .55) 62% 90%, transparent 90%);
}
.detail-head__subtitle { position: relative; z-index: 1; margin-top: 4px; color: #3b4a5e; font-size: 13px; font-weight: 700; letter-spacing: .5px; }
.detail-head__cat { position: absolute; right: -22px; top: calc(40px + env(safe-area-inset-top)); width: 158px; height: 92px; opacity: .96; }

.owner { display: flex; align-items: center; gap: 12px; min-height: 62px; padding: 0 4px; }
.owner__avatar { flex: none; width: 50px; height: 50px; border: 3px solid #cfe4f1; border-radius: 50%; background: #eef5fa; }
.owner__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.owner__name { overflow: hidden; color: $ink; font-size: 17px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.owner__id { overflow: hidden; color: $muted; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.owner__pinned {
  flex: none;
  padding: 4px 12px 5px;
  background: linear-gradient(96deg, #f3c83f, #f8dc79 72%, #f1c23b);
  clip-path: polygon(2% 8%, 98% 0, 96% 91%, 72% 87%, 50% 100%, 28% 89%, 0 96%);
  color: $ink;
  font-size: 13px;
  font-weight: 800;
  transform: rotate(-3deg);
}

.topic {
  position: relative;
  margin-top: 12px;
  padding: 14px 76px 14px 14px;
  border-radius: 6px 12px 8px 10px;
  background:
    repeating-linear-gradient(118deg, rgba(255, 255, 255, .18) 0 2px, transparent 2px 9px),
    linear-gradient(110deg, #e9f2df 0%, #dfeccf 100%);
  box-shadow: 0 4px 12px rgba(39, 68, 56, .06);
}
.topic__tag {
  display: inline;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f6dc8c;
  color: #3a3220;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.9;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.topic__meta { display: flex; gap: 8px; margin-top: 10px; }
.topic__meta text { padding: 2px 10px; border: 1px solid rgba(36, 73, 63, .18); border-radius: 999px; background: rgba(255, 255, 255, .55); color: #24493f; font-size: 12px; font-weight: 700; }
.topic__cat { position: absolute; right: 6px; bottom: 6px; width: 66px; height: 34px; }

.qa-list { display: flex; flex-direction: column; gap: 18px; margin-top: 20px; }
.qa-card {
  --card-bg: #fbf1d4;
  --card-bg-deep: #f7e7bb;
  --slot-bg: #f3d27a;
  position: relative;
  padding: 16px 14px 14px;
  border-radius: 4px 10px 6px 8px;
  background:
    repeating-linear-gradient(116deg, rgba(255, 255, 255, .2) 0 2px, transparent 2px 9px),
    linear-gradient(160deg, var(--card-bg) 0%, var(--card-bg-deep) 100%);
  box-shadow: 0 6px 14px rgba(84, 66, 27, .08);
}
.qa-card::before {
  content: '';
  position: absolute;
  top: -6px;
  left: -4px;
  width: 34px;
  height: 12px;
  background: rgba(190, 200, 204, .45);
  transform: rotate(-22deg);
}
.qa-card--2 { --card-bg: #e7f2fa; --card-bg-deep: #d9eaf6; --slot-bg: #bcdaf0; }
.qa-card--3 { --card-bg: #ecf3e3; --card-bg-deep: #e0ecd4; --slot-bg: #cde2c0; }
.qa-card--2::before { background: rgba(170, 190, 206, .45); transform: rotate(-16deg); }
.qa-card--3::before { background: rgba(176, 194, 178, .5); transform: rotate(-26deg); }
.qa-card__head { display: flex; align-items: flex-start; gap: 12px; }
.qa-card__slot { flex: none; padding: 1px 10px; border-radius: 3px; background: var(--slot-bg); color: $ink; font-size: 21px; font-weight: 900; line-height: 1.3; }
.qa-card__question { color: $ink; font-size: 16px; font-weight: 800; line-height: 1.45; }
.qa-card__answer {
  display: block;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 254, 250, .92);
  box-shadow: 0 2px 6px rgba(39, 68, 56, .05);
  color: #274a78;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
}

.no-questions { padding: 60px 16px; color: var(--tago-muted); text-align: center; }

.detail-foot { position: relative; display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 24px; }
.detail-foot__leaf { position: absolute; left: -38px; bottom: -14px; width: 48px; height: 60px; opacity: .8; transform: rotate(-18deg); pointer-events: none; }
.detail-foot__state { color: var(--tago-muted); font-size: 14px; text-align: center; }

.meet,
.bid-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  max-width: 240px;
  height: 50px;
  margin: 0;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 2px;
  line-height: 1;
}
.meet::after,
.bid-btn::after { border: 0; }
.meet:active,
.bid-btn:active { transform: translateY(1px) scale(.98); }

.meet {
  color: #fff;
  background: linear-gradient(180deg, #276357 0%, #1f564c 100%);
  box-shadow: 0 8px 18px rgba(32, 88, 79, .2);
}
.bid-btn {
  border: 1.5px solid rgba(142, 50, 28, .25);
  background: #fbf1d4;
  color: #8e321c;
}</style>
