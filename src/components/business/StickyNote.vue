<script setup lang="ts">
import { computed } from 'vue'
import type { NoteTone } from '@/types/models'

const props = withDefaults(defineProps<{ number: number; question: string; modelValue?: string; tone?: NoteTone; readonly?: boolean; maxlength?: number }>(), {
  modelValue: '', tone: 'yellow', readonly: false, maxlength: 200,
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const remaining = computed(() => `${props.modelValue.length}/${props.maxlength}`)

function update(event: Event) {
  const value = (event as Event & { detail: { value: string } }).detail.value
  emit('update:modelValue', value.slice(0, props.maxlength))
}
</script>

<template>
  <view class="note" :class="`note--${tone}`" data-testid="sticky-note">
    <text class="note__tape" aria-hidden="true"></text>
    <view class="note__question"><text class="note__number">Q{{ number }}</text><text>{{ question }}</text></view>
    <textarea v-if="!readonly" class="note__input" :value="modelValue" :maxlength="maxlength" placeholder="写下你的真实想法…" @input="update" />
    <text v-else class="note__answer">{{ modelValue }}</text>
    <text v-if="!readonly" class="note__count">{{ remaining }}</text>
  </view>
</template>

<style scoped lang="scss">
.note { position:relative; margin-bottom:10rpx; padding:18rpx 18rpx 13rpx; overflow:hidden; border-radius:7rpx 18rpx 8rpx 14rpx; box-shadow:0 6rpx 15rpx rgba(39,68,56,.09); }
.note--yellow { background: var(--tago-note-yellow); } .note--blue { background: var(--tago-note-blue); } .note--green { background: var(--tago-note-green); } .note--pink { background: var(--tago-note-pink); }
.note__tape { position:absolute; top:-8rpx; left:35rpx; width:72rpx; height:23rpx; background:rgba(255,255,255,.45); transform:rotate(-5deg); }.note::after { content:''; position:absolute; right:0; bottom:0; left:0; height:5rpx; background:repeating-linear-gradient(90deg,transparent 0 10rpx,rgba(255,255,255,.65) 10rpx 16rpx); }
.note__question { display:flex; align-items:center; gap:11rpx; font-size:22rpx; font-weight:850; }.note__number { padding:5rpx 7rpx; border-radius:50%; background:rgba(255,255,255,.65); font-size:21rpx; }
.note__input,.note__answer { display:block; width:100%; min-height:58rpx; margin-top:10rpx; padding:11rpx 14rpx; border-radius:11rpx; background:rgba(255,255,255,.68); font-size:19rpx; line-height:1.45; }.note__input { height:68rpx; }
.note__count { display:block; margin-top:-24rpx; padding-right:8rpx; color:var(--tago-muted); font-size:15rpx; text-align:right; }
</style>
