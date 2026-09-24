<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, reactive, shallowRef } from 'vue'
import type { TagDto } from '@/api/social'
import { closeTag, createTag, editTagBody, generateTagQuestions, getMyTag, publishTag, refreshTagQuestion, savePublisherAnswer } from '@/api/social'
import AppHeader from '@/components/business/AppHeader.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import { goBack } from '@/utils/navigation'

const body = shallowRef('')
const duration = shallowRef<'DAY' | 'WEEK' | 'MONTH' | 'LONG_TERM'>('WEEK')
const encounterMode = shallowRef<'ONLINE' | 'OFFLINE' | 'BOTH'>('BOTH')
const draft = shallowRef<TagDto | null>(null)
const source = shallowRef<TagDto | null>(null)
const answers = reactive<Record<number, string>>({})
const loading = shallowRef(false)
const working = shallowRef(false)
const error = shallowRef('')
const editing = shallowRef(false)

const questions = computed(() => source.value?.questions.filter(q => q.generated && q.text) || [])
const canPublish = computed(() => body.value.trim().length >= 4 && questions.value.length === 3 && questions.value.every(q => answers[q.slot]?.trim()))
const durationOptions = [
  { value: 'DAY', label: '即时' },
  { value: 'WEEK', label: '本周' },
  { value: 'MONTH', label: '30 天' },
  { value: 'LONG_TERM', label: '长期' },
] as const

function clearAnswers() {
  for (const slot of Object.keys(answers)) delete answers[Number(slot)]
}

function showTag(tag: TagDto) {
  source.value = tag
  body.value = tag.body
  duration.value = tag.duration
  encounterMode.value = tag.encounterMode
  clearAnswers()
  for (const answer of tag.publisherAnswers) answers[answer.slot] = answer.text
}

async function load() {
  if (loading.value || body.value.trim() || source.value) return
  if (!editing.value) {
    draft.value = null
    source.value = null
    body.value = ''
    clearAnswers()
    return
  }
  loading.value = true
  error.value = ''
  try {
    const current = (await getMyTag()).active
    draft.value = null
    if (current) showTag(current)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Tag 加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  editing.value = query?.edit === '1'
  load()
})

async function ensureDraft() {
  let value = draft.value
  if (!value) {
    const mine = await getMyTag()
    if (mine.draft && mine.draft.body !== body.value.trim()) value = await editTagBody(mine.draft.id, { body: body.value.trim(), expectedVersion: mine.draft.version })
    else if (mine.draft) value = mine.draft
    else value = await createTag({ body: body.value.trim(), duration: duration.value, encounterMode: encounterMode.value })
  } else if (value.body !== body.value.trim()) value = await editTagBody(value.id, { body: body.value.trim(), expectedVersion: value.version })
  draft.value = value
  return value
}

async function replaceQuestions(value: TagDto) {
  if (value.questions.some(q => q.generated)) {
    for (const q of value.questions.filter(item => item.generated && item.refreshCount < 5)) {
      value = await refreshTagQuestion(value.id, q.slot, value.version)
    }
  } else value = await generateTagQuestions(value.id, value.version)
  return value
}

async function generate() {
  if (body.value.trim().length < 4) return uni.showToast({ title: '先写下至少 4 个字', icon: 'none' })
  working.value = true
  try {
    const value = await replaceQuestions(await ensureDraft())
    draft.value = value
    source.value = value
    clearAnswers()
  } finally {
    working.value = false
  }
}

function sameQuestions(tag: TagDto) {
  const shown = questions.value
  const next = tag.questions.filter(q => q.generated && q.text)
  return shown.length === next.length && shown.every((q, index) => q.slot === next[index].slot && q.text === next[index].text)
}

async function publish() {
  if (!canPublish.value || !source.value || working.value) return
  working.value = true
  try {
    let value = await ensureDraft()
    if (!sameQuestions(value)) {
      if (value.state === 'DRAFT') await closeTag(value.id)
      draft.value = null
      value = await createTag({ body: body.value.trim(), duration: duration.value, encounterMode: encounterMode.value })
      if (!value.questions.some(q => q.generated && q.text)) value = await generateTagQuestions(value.id, value.version)
    }
    for (const q of value.questions.filter(item => item.generated && item.text)) {
      const text = answers[q.slot]?.trim()
      if (!text) throw new Error('请先回答三道问题')
      value = await savePublisherAnswer(value.id, q.slot, { expectedVersion: value.version, questionVersion: q.questionVersion, text })
    }
    await publishTag(value.id, value.version)
    uni.showToast({ title: 'Tag 发布成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/discover/index' }), 500)
  } catch (cause) {
    uni.showToast({ title: cause instanceof Error ? cause.message : '发布失败', icon: 'none' })
  } finally {
    working.value = false
  }
}

onShow(load)
</script>

<template>
  <view class="tago-page tago-page--detail compose-page">
    <AppHeader
      class="compose-header"
      variant="home"
      back
      :slogan="'一个小小的念头，\n也可能遇见\n同频的人 :)'"
      title="发一个 Tag"
      subtitle="写下此刻，你想让什么发生。"
      @back="goBack"
    />
    <AsyncState :loading="loading" :error="error" @retry="load">
      <section class="tag-card">
        <view class="tag-card__label"><text class="tag-card__pencil">✎</text>写下你的 Tag</view>
        <view class="tag-entry">
          <text class="tag-entry__hash">#</text>
          <textarea v-model="body" maxlength="25" placeholder="此刻你想和怎样的人发生什么？" placeholder-class="tag-placeholder" />
          <text class="counter">{{ Array.from(body).length }}/25</text>
        </view>
        <view class="tag-hint">
          <image src="/static/illustrations/meet-seedling.png" mode="aspectFit" aria-hidden="true" />
          <text>不用介绍完整的自己，只说你现在想发生什么。</text>
        </view>
      </section>

      <section class="question-section">
        <view class="section-head">
          <view class="section-head__copy">
            <view class="section-title">
              <image src="/static/illustrations/meet-seedling.png" mode="aspectFit" aria-hidden="true" />
              <text>再多说一点</text>
              <i class="spark" aria-hidden="true" />
            </view>
            <text class="section-subtitle">让想认识你的人，更容易理解这个 Tag。</text>
          </view>
          <button class="refresh-set" :disabled="working" @click="generate">
            <text class="refresh-set__icon" :class="{ spinning: working }">↻</text>换一组
          </button>
        </view>
        <view v-if="questions.length" class="question-list">
          <article v-for="question in questions" :key="question.slot" class="question-card" :class="`question-card--${question.slot}`">
            <view class="question-card__side">
              <b>Q{{ question.slot }}</b>
              <i class="spark spark--small" aria-hidden="true" />
            </view>
            <view class="question-card__main">
              <text class="question-card__prompt">{{ question.text }}</text>
              <view class="answer-entry">
                <textarea v-model="answers[question.slot]" maxlength="25" auto-height placeholder="认真写下你的回答…" placeholder-class="answer-placeholder" />
                <text>{{ Array.from(answers[question.slot] || '').length }}/25</text>
              </view>
            </view>
          </article>
        </view>
        <view v-else class="question-empty">写完 Tag 后点「换一组」，AI 会为你生成三个问题。</view>
      </section>

      <section class="duration-section">
        <view class="section-title">
          <image src="/static/illustrations/meet-seedling.png" mode="aspectFit" aria-hidden="true" />
          <text>这个 Tag 想留多久？</text>
          <i class="spark" aria-hidden="true" />
        </view>
        <view class="duration-options">
          <button v-for="option in durationOptions" :key="option.value" :class="{ active: duration === option.value }" @click="duration = option.value">{{ option.label }}</button>
        </view>
      </section>

      <view class="publish-wrap">
        <button class="publish" :class="{ 'is-idle': !canPublish }" :disabled="!canPublish || working" :loading="working" @click="publish">
          <svg class="publish__plane" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21.5 2.8 2.9 10.3c-.8.3-.8 1.5.1 1.8l6.3 2.1 2.1 6.3c.3.9 1.5.9 1.8.1l7.5-18.6c.3-.7-.4-1.4-1.2-1.2Z" />
            <path d="m9.3 14.2 12-11.1" />
          </svg>
          <text>发布这个 Tag</text>
          <i class="spark" aria-hidden="true" />
        </button>
      </view>
    </AsyncState>
  </view>
</template>

<style scoped lang="scss">
.compose-page {
  overflow-x: hidden;
  padding-right: 24rpx;
  padding-left: 24rpx;
  background: linear-gradient(180deg, #faf9f5 0%, #f8f7f2 100%);
}

.spark {
  display: inline-block;
  width: 30rpx;
  height: 30rpx;
  flex: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23f2c94c' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 11 2.6 3.5M8.5 10.5 12.5 3.8M10 15.5l7.5-2.6'/%3E%3C/svg%3E") center / contain no-repeat;
}

.spark--small {
  width: 24rpx;
  height: 24rpx;
}

.tag-card {
  position: relative;
  padding: 22rpx 22rpx 20rpx;
  border-radius: 10rpx 14rpx 10rpx 12rpx;
  background:
    repeating-linear-gradient(117deg, rgba(184, 151, 97, .04) 0 2px, transparent 2px 10px),
    linear-gradient(114deg, #fff6d9 0%, #fcefc6 60%, #faebbd 100%);
  box-shadow: 0 8rpx 20rpx rgba(84, 66, 27, .1);
}

.tag-card::before,
.tag-card::after {
  content: '';
  position: absolute;
  width: 64rpx;
  height: 22rpx;
  background: rgba(226, 212, 180, .75);
}

.tag-card::before {
  top: 4rpx;
  left: -18rpx;
  transform: rotate(-38deg);
}

.tag-card::after {
  right: -18rpx;
  bottom: 30rpx;
  transform: rotate(-38deg);
}

.tag-card__label {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 14rpx;
  padding: 4rpx 22rpx 6rpx 14rpx;
  background: linear-gradient(180deg, rgba(255, 244, 196, .6), rgba(245, 214, 110, .85));
  color: #232823;
  font-size: 25rpx;
  font-weight: 900;
}

.tag-card__pencil {
  color: #20584f;
  font-size: 30rpx;
  line-height: 1;
}

.tag-entry {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-height: 136rpx;
  padding: 26rpx 20rpx 34rpx;
  border-radius: 16rpx;
  background: rgba(255, 254, 249, .95);
}

.tag-entry__hash {
  flex: none;
  margin-right: 12rpx;
  color: #20241f;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.4;
}

.tag-entry textarea {
  flex: 1;
  width: auto;
  min-width: 0;
  height: 100rpx;
  color: #20241f;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.5;
}

.counter {
  position: absolute;
  right: 20rpx;
  bottom: 12rpx;
  color: #8a8f88;
  font-size: 19rpx;
}

.tag-hint {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 16rpx;
}

.tag-hint image {
  width: 30rpx;
  height: 30rpx;
  flex: none;
}

.tag-hint text {
  color: #5f665e;
  font-size: 19rpx;
  line-height: 1.5;
}

.question-section {
  margin-top: 36rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.section-head__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: #20241f;
  font-size: 31rpx;
  font-weight: 900;
}

.section-title image {
  width: 40rpx;
  height: 40rpx;
  flex: none;
}

.section-subtitle {
  margin-top: 6rpx;
  padding-left: 50rpx;
  color: #5f665e;
  font-size: 20rpx;
}

.refresh-set {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10rpx;
  height: 66rpx;
  margin: 0;
  padding: 0 28rpx;
  border: 0;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #e3efd9, #d7e8cb);
  box-shadow: 0 4rpx 10rpx rgba(39, 68, 56, .08);
  color: #20584f;
  font-size: 25rpx;
  font-weight: 800;
  line-height: 66rpx;
  transform: rotate(-2deg);
}

.refresh-set::after,
.publish::after,
.duration-options button::after {
  border: 0;
}

.refresh-set[disabled] {
  opacity: .6;
}

.refresh-set__icon {
  font-size: 32rpx;
  font-weight: 900;
}

.refresh-set__icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.question-card {
  display: flex;
  gap: 8rpx;
  padding: 18rpx 18rpx 16rpx 14rpx;
  border-radius: 10rpx 14rpx 10rpx 12rpx;
  background:
    repeating-linear-gradient(116deg, rgba(255, 255, 255, .14) 0 2px, transparent 2px 9px),
    linear-gradient(155deg, #eaf3e1 0%, #e1eed6 100%);
  box-shadow: 0 6rpx 14rpx rgba(39, 68, 56, .06);
}

.question-card--2 {
  background:
    repeating-linear-gradient(116deg, rgba(255, 255, 255, .14) 0 2px, transparent 2px 9px),
    linear-gradient(155deg, #e6f0fa 0%, #dbe9f6 100%);
}

.question-card--3 {
  background:
    repeating-linear-gradient(116deg, rgba(255, 255, 255, .14) 0 2px, transparent 2px 9px),
    linear-gradient(155deg, #fcf2d6 0%, #f8eac4 100%);
}

.question-card__side {
  display: flex;
  width: 70rpx;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.question-card__side b {
  padding: 2rpx 10rpx 4rpx;
  background: linear-gradient(180deg, transparent 20%, #f4df8e 20%, #f4df8e 90%, transparent 90%);
  color: #20241f;
  font-size: 27rpx;
  font-weight: 900;
}

.question-card--2 .question-card__side b {
  background: linear-gradient(180deg, transparent 20%, #bcd8f0 20%, #bcd8f0 90%, transparent 90%);
}

.question-card--3 .question-card__side b {
  background: linear-gradient(180deg, transparent 20%, #f6d579 20%, #f6d579 90%, transparent 90%);
}

.question-card__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.question-card__prompt {
  color: #232823;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.5;
}

.answer-entry {
  position: relative;
  margin-top: 12rpx;
  padding: 16rpx 18rpx 32rpx;
  border-radius: 12rpx;
  background: rgba(255, 254, 249, .95);
}

.answer-entry textarea {
  width: 100%;
  min-height: 40rpx;
  color: #20241f;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1.5;
}

.compose-page :deep(.answer-placeholder),
.compose-page :deep(.tag-placeholder) {
  color: #a3a8a1;
  font-weight: 500;
}

.compose-page :deep(.answer-placeholder) {
  font-size: 23rpx;
}

.answer-entry text {
  position: absolute;
  right: 14rpx;
  bottom: 8rpx;
  color: #8a8f88;
  font-size: 18rpx;
}

.question-empty {
  padding: 40rpx 20rpx;
  border: 2rpx dashed rgba(32, 88, 79, .15);
  border-radius: 20rpx;
  color: var(--tago-muted);
  font-size: 22rpx;
  line-height: 1.65;
  text-align: center;
}

.duration-section {
  margin-top: 36rpx;
}

.duration-options {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
}

.duration-options button {
  flex: 1;
  min-width: 0;
  height: 62rpx;
  margin: 0;
  padding: 0 6rpx;
  border: 0;
  border-radius: 999rpx;
  background: #ebeae5;
  color: #3f4640;
  font-size: 23rpx;
  line-height: 62rpx;
  white-space: nowrap;
}

.duration-options button.active {
  background: #20584f;
  color: #fff;
}

.publish-wrap {
  margin-top: 40rpx;
}

.publish {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  height: 96rpx;
  margin: 0 8rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #245f56 0%, #1f5249 100%);
  box-shadow: 0 10rpx 22rpx rgba(32, 88, 79, .18);
  color: #fff;
  font-size: 33rpx;
  font-weight: 900;
  line-height: 96rpx;
}

.publish[disabled] {
  opacity: 1;
}

.publish.is-idle {
  background: #b7ddd3;
  box-shadow: none;
  color: #fff;
}

.publish.is-idle .publish__plane {
  fill: #fff;
  stroke: #7eaea3;
}

.publish__plane {
  width: 38rpx;
  height: 38rpx;
  fill: #fff;
  stroke: #245f56;
  stroke-width: 1.4;
  stroke-linejoin: round;
}

.compose-page :deep(.header) {
  width: calc(100% + 48rpx);
  min-height: 250rpx;
  margin-left: -24rpx;
  padding-right: 28rpx;
  padding-left: 36rpx;
}

.compose-page :deep(.header__copy) {
  padding-left: 14rpx;
}

.compose-page :deep(.header__brand) {
  margin-left: 24rpx;
}

.compose-page :deep(.header__logo) {
  width: 270rpx;
  height: 90rpx;
  margin-left: -20rpx;
}

.compose-page :deep(.header__title) {
  font-size: 46rpx;
}

.compose-page :deep(.header__subtitle) {
  font-size: 22rpx;
}

.compose-page :deep(.header__slogan) {
  font-size: 19rpx;
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
  transform: translate(60rpx, 6rpx) rotate(-4deg);
}

.compose-page :deep(.header--home .header__brand) {
  margin-bottom: 4rpx;
}

.compose-page :deep(.header--home) {
  padding-bottom: 8rpx;
}

.compose-page :deep(.header__cat-art) {
  right: -30rpx;
  bottom: 0;
  width: 330rpx;
  height: 165rpx;
}

@media (max-width: 390px) {
  .compose-page :deep(.header__copy) {
    padding-right: 174rpx;
  }

  .compose-page :deep(.header__slogan) {
    display: none;
  }

  .compose-page :deep(.header__logo) {
    width: 230rpx;
    height: 77rpx;
  }

  .duration-options button {
    font-size: 20rpx;
  }
}
</style>
