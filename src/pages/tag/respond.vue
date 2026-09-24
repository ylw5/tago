<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, shallowRef } from 'vue'
import type { TagDto } from '@/api/social'
import { getProfile } from '@/api/account'
import { durationLabel } from '@/api/adapters'
import { getPublicTag, listApplications, submitApplication } from '@/api/social'
import AsyncState from '@/components/ui/AsyncState.vue'
import AvatarImage from '@/components/ui/AvatarImage.vue'
import { goBack } from '@/utils/navigation'

const tag = shallowRef<TagDto | null>(null)
const answers = reactive<Record<number, string>>({})
const loading = shallowRef(true)
const submitting = shallowRef(false)
const error = shallowRef('')
const myPublicId = shallowRef('')
const hasPending = shallowRef(false)

const isMine = computed(() => Boolean(tag.value && tag.value.ownerIdentity.publicId === myPublicId.value))
const questions = computed(() => tag.value?.questions.filter(q => q.generated && q.text) || [])
const canSend = computed(() => !isMine.value && !hasPending.value && questions.value.length === 3 && questions.value.every(q => answers[q.slot]?.trim()))
const encounterLabel = computed(() => {
  const mode = tag.value?.encounterMode
  return mode === 'ONLINE' ? '线上' : mode === 'OFFLINE' ? '线下' : '线上或线下'
})

const questionNotes: Record<number, string[]> = {
  1: ['写得具体一点', '更容易被看见 :)'],
  2: ['真诚一点', '同频的人', '会更快靠近 ♡'],
  3: ['一份认真回答', '也许会带来', '一次新的相遇 :)'],
}

async function load(id: string) {
  loading.value = true
  error.value = ''
  try {
    const [detail, profile, outgoing] = await Promise.all([
      getPublicTag(id),
      getProfile(),
      listApplications({ direction: 'OUTGOING', state: 'PENDING', limit: 30 }),
    ])
    tag.value = detail
    myPublicId.value = profile.publicId
    hasPending.value = outgoing.items.some(item => item.tagId === id)
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Tag 加载失败' }
  finally { loading.value = false }
}

async function send() {
  if (!tag.value || !canSend.value || submitting.value) return
  submitting.value = true
  try {
    await submitApplication(tag.value.id, {
      answers: questions.value.map(q => ({ slot: q.slot, questionVersion: q.questionVersion, text: answers[q.slot].trim() })),
    })
    hasPending.value = true
    uni.showToast({ title: '申请已送达，等待对方处理', icon: 'none' })
    setTimeout(() => uni.reLaunch({ url: '/pages/meet/index' }), 1200)
  }
  catch (cause) { uni.showToast({ title: cause instanceof Error ? cause.message : '申请发送失败', icon: 'none' }) }
  finally { submitting.value = false }
}

onLoad(q => {
  const id = typeof q?.id === 'string' ? q.id : ''
  if (id) load(id)
  else { loading.value = false; error.value = '缺少 Tag ID' }
})
</script>

<template>
  <view class="tago-page tago-page--detail respond-page">
    <view class="respond-head">
      <button class="respond-head__back" aria-label="返回" @click="goBack" />
      <view class="respond-head__brand">
        <image class="respond-head__logo" src="/static/illustrations/tago-wordmark.png" mode="aspectFit" aria-label="TAGO" />
        <view class="respond-head__spark" aria-hidden="true"><i /><i /><i /></view>
      </view>
      <text class="respond-head__title">回应TA的三个问题</text>
      <text class="respond-head__subtitle">用真诚的回答，开启一次新的相遇吧~</text>
      <text class="respond-head__note">每一次真诚回应，{{ '\n' }}都可能带来新的相遇 :)</text>
      <image class="respond-head__cat" src="/static/illustrations/drawer-cat.png" mode="aspectFit" aria-hidden="true" />
    </view>

    <AsyncState :loading="loading" :error="error" :empty="!tag" empty-title="没有找到这个 Tag" @retry="tag && load(tag.id)">
      <template v-if="tag">
        <view class="reason">
          <text>你想因为</text>
          <text class="reason__tag"># {{ tag.body }}</text>
          <text>认识TA</text>
          <image class="reason__cat" src="/static/illustrations/cat-lying.png" mode="aspectFit" aria-hidden="true" />
        </view>

        <view class="owner">
          <AvatarImage class="owner__avatar" :id="tag.ownerIdentity.avatarId" />
          <text class="owner__name">{{ tag.ownerIdentity.displayName }}</text>
          <text class="owner__note">{{ encounterLabel }} · {{ durationLabel(tag.duration) }}{{ '\n' }}期待和你认真聊聊 ♡</text>
        </view>

        <view v-if="questions.length" class="answer-list">
          <view v-for="q in questions" :key="q.slot" class="answer-card" :class="`answer-card--${q.slot}`">
            <view class="answer-card__head">
              <text class="answer-card__slot">Q{{ q.slot }}</text>
              <text class="answer-card__question">{{ q.text }}</text>
            </view>
            <view class="answer-card__body">
              <view class="answer-card__field">
                <textarea
                  v-model="answers[q.slot]"
                  class="answer-card__input"
                  maxlength="200"
                  placeholder="写下你的真实回答…"
                  placeholder-class="answer-card__placeholder"
                />
                <text class="answer-card__count">{{ Array.from(answers[q.slot] || '').length }}/200</text>
              </view>
              <view class="answer-card__side" aria-hidden="true">
                <image class="answer-card__cat" src="/static/illustrations/cat-lying.png" mode="aspectFit" />
                <text class="answer-card__note">{{ (questionNotes[q.slot] || []).join('\n') }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="no-questions">这个 Tag 暂时没有完整的问题，暂不能提交申请。</view>

        <view class="respond-foot">
          <image class="respond-foot__leaf" src="/static/decor/leaf-sprig.png" mode="aspectFit" aria-hidden="true" />
          <view v-if="isMine" class="respond-foot__state">这是你发布的 Tag</view>
          <view v-else-if="hasPending" class="respond-foot__state">申请已送达，等待对方回应</view>
          <button v-else class="send" :class="{ 'is-idle': !canSend }" :disabled="!canSend || submitting" :loading="submitting" @click="send">发送认识申请</button>
        </view>
      </template>
    </AsyncState>
  </view>
</template>

<style scoped lang="scss">
.respond-page {
  position: relative;
  overflow-x: hidden;
  padding-left: 16px;
  padding-right: 16px;
  background:
    radial-gradient(circle at 12% 4%, rgba(249, 231, 173, .3), transparent 28%),
    repeating-linear-gradient(0deg, rgba(32, 88, 79, .018) 0 1px, transparent 1px 8px),
    linear-gradient(180deg, #faf7ee 0%, #f5f1e4 100%);
}

.respond-head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 150px;
  padding: calc(14px + env(safe-area-inset-top)) 0 12px 26px;
}

.respond-head__back {
  position: absolute;
  top: calc(20px + env(safe-area-inset-top));
  left: -12px;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
}
.respond-head__back::before {
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
.respond-head__back::after { border: 0; }

.respond-head__brand { position: relative; }
.respond-head__logo { display: block; width: 116px; height: 40px; }
.respond-head__spark { position: absolute; top: -4px; right: -24px; width: 22px; height: 26px; }
.respond-head__spark i { position: absolute; left: 0; width: 13px; height: 3px; border-radius: 3px; background: #f4c94c; transform-origin: left center; }
.respond-head__spark i:nth-child(1) { top: 3px; transform: rotate(-42deg); }
.respond-head__spark i:nth-child(2) { top: 12px; transform: rotate(-10deg); }
.respond-head__spark i:nth-child(3) { top: 21px; transform: rotate(22deg); }

.respond-head__title {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  color: #1f2b3b;
  font-size: 27px;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1.3;
}
.respond-head__subtitle {
  position: relative;
  z-index: 1;
  margin-top: 4px;
  color: #3b4a5e;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .5px;
}

.respond-head__note {
  position: absolute;
  top: calc(18px + env(safe-area-inset-top));
  right: 18px;
  color: #56677d;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-line;
  transform: rotate(-5deg);
}
.respond-head__cat {
  position: absolute;
  right: -22px;
  top: calc(58px + env(safe-area-inset-top));
  width: 158px;
  height: 92px;
  opacity: .96;
}

.reason {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 8px 66px 8px 12px;
  white-space: nowrap;
  border-radius: 6px 12px 8px 10px;
  background:
    repeating-linear-gradient(118deg, rgba(255, 255, 255, .18) 0 2px, transparent 2px 9px),
    linear-gradient(110deg, #e9f2df 0%, #dfeccf 100%);
  box-shadow: 0 4px 12px rgba(39, 68, 56, .06);
  color: #24493f;
  font-size: 15px;
  font-weight: 800;
}
.reason > text { flex: none; }
.reason > .reason__tag {
  flex: 0 1 auto;
  min-width: 0;
  padding: 4px 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #f6dc8c;
  color: #3a3220;
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reason__cat { position: absolute; right: 4px; bottom: 4px; width: 60px; height: 30px; }

.owner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  margin-top: 14px;
  padding: 0 4px;
}
.owner__avatar {
  flex: none;
  width: 50px;
  height: 50px;
  border: 3px solid #cfe4f1;
  border-radius: 50%;
  background: #eef5fa;
}
.owner__name { min-width: 0; flex: 1; overflow: hidden; color: #1f2b3b; font-size: 17px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.owner__note {
  flex: none;
  color: #56677d;
  font-size: 11px;
  line-height: 1.55;
  text-align: right;
  white-space: pre-line;
  transform: rotate(-3deg);
}

.answer-list { display: flex; flex-direction: column; gap: 18px; margin-top: 14px; }

.answer-card {
  --card-bg: #fbf1d4;
  --card-bg-deep: #f7e7bb;
  --slot-bg: #f3d27a;
  position: relative;
  padding: 16px 14px 12px;
  border-radius: 4px 10px 6px 8px;
  background:
    repeating-linear-gradient(116deg, rgba(255, 255, 255, .2) 0 2px, transparent 2px 9px),
    linear-gradient(160deg, var(--card-bg) 0%, var(--card-bg-deep) 100%);
  box-shadow: 0 6px 14px rgba(84, 66, 27, .08);
}
.answer-card::before {
  content: '';
  position: absolute;
  top: -6px;
  left: -4px;
  width: 34px;
  height: 12px;
  background: rgba(190, 200, 204, .45);
  transform: rotate(-22deg);
}
.answer-card--2 { --card-bg: #e7f2fa; --card-bg-deep: #d9eaf6; --slot-bg: #bcdaf0; }
.answer-card--3 { --card-bg: #ecf3e3; --card-bg-deep: #e0ecd4; --slot-bg: #cde2c0; }
.answer-card--2::before { background: rgba(170, 190, 206, .45); transform: rotate(-16deg); }
.answer-card--3::before { background: rgba(176, 194, 178, .5); transform: rotate(-26deg); }

.answer-card__head { display: flex; align-items: flex-start; gap: 12px; padding-right: 4px; }
.answer-card__slot {
  flex: none;
  padding: 1px 10px;
  border-radius: 3px;
  background: var(--slot-bg);
  color: #1f2b3b;
  font-size: 21px;
  font-weight: 900;
  line-height: 1.3;
}
.answer-card__question { color: #1f2b3b; font-size: 16px; font-weight: 800; line-height: 1.45; }

.answer-card__body { display: flex; align-items: stretch; gap: 8px; margin-top: 10px; }
.answer-card__field { min-width: 0; flex: 1; }
.answer-card__input {
  box-sizing: border-box;
  width: 100%;
  height: 84px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 254, 250, .92);
  box-shadow: 0 2px 6px rgba(39, 68, 56, .05);
  color: #274a78;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
}
:deep(.answer-card__placeholder) { color: #9aa3ad; font-weight: 400; }
.answer-card__count { display: block; margin-top: 4px; color: #7b8378; font-size: 11px; text-align: right; }

.answer-card__side { display: flex; flex: none; flex-direction: column; align-items: center; width: 92px; }
.answer-card__cat { width: 84px; height: 44px; }
.answer-card__note {
  margin-top: 4px;
  color: #56677d;
  font-size: 11px;
  line-height: 1.45;
  text-align: center;
  white-space: pre-line;
  transform: rotate(-4deg);
}
.answer-card--2 .answer-card__cat { transform: scaleX(-1); }
.answer-card--3 .answer-card__side { flex-direction: column-reverse; justify-content: flex-end; }
.answer-card--3 .answer-card__note { margin: 0 0 4px; }

.respond-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
}
.respond-foot__leaf { position: absolute; left: -24px; bottom: -6px; width: 56px; height: 68px; opacity: .85; transform: rotate(-12deg); pointer-events: none; }
.respond-foot__state { color: var(--tago-muted); font-size: 14px; text-align: center; }

.send {
  width: 62%;
  max-width: 240px;
  height: 50px;
  margin: 0;
  color: #fff;
  border-radius: 999px;
  background: linear-gradient(180deg, #276357 0%, #1f564c 100%);
  box-shadow: 0 8px 18px rgba(32, 88, 79, .2);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 3px;
  line-height: 50px;
}
.send::after { border: 0; }
.send[disabled] { opacity: 1; }
.send.is-idle {
  background: #b7ddd3;
  box-shadow: none;
  color: #fff;
}

.no-questions { padding: 60px 16px; color: var(--tago-muted); text-align: center; }
</style>
