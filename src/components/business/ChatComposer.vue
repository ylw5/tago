<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  connected: boolean
  sending: boolean
  error?: string
}>()

const emit = defineEmits<{
  add: []
  gift: []
  send: []
}>()

const draft = defineModel<string>({ default: '' })
const canSend = computed(() => props.connected && !props.sending && Boolean(draft.value.trim()))
</script>

<template>
  <view class="chat-composer">
    <text v-if="error" class="chat-composer__error" role="alert">{{ error }}</text>
    <view class="chat-composer__row">
      <button class="chat-composer__add" aria-label="更多" @click="emit('add')"><i aria-hidden="true" /></button>
      <view class="chat-composer__field">
        <textarea
          v-model="draft"
          class="chat-composer__input"
          :disabled="!connected"
          maxlength="1000"
          :placeholder="connected ? '输入消息…' : '聊天服务连接后可发送'"
        />
        <button class="chat-composer__gift" aria-label="送礼物" @click="emit('gift')">
          <image src="/static/stickers/gift.png" mode="aspectFit" aria-hidden="true" />
        </button>
      </view>
      <button
        class="chat-composer__send"
        :disabled="!canSend"
        :loading="sending"
        @click="emit('send')"
      >
        发送
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-composer {
  position: relative;
  z-index: 2;
  flex: none;
  margin: 0 -24rpx;
  padding: 16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: rgba(255, 254, 250, .97);
  box-shadow: 0 -8rpx 24rpx rgba(39, 68, 56, .08);
}

.chat-composer__error {
  display: block;
  margin: 0 4rpx 10rpx;
  padding: 9rpx 14rpx;
  color: #9d463d;
  border-radius: 12rpx;
  background: rgba(236, 203, 190, .48);
  font-size: 17rpx;
  line-height: 1.4;
}

.chat-composer__row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.chat-composer__add,
.chat-composer__gift,
.chat-composer__send {
  display: grid;
  min-width: 0;
  margin: 0;
  padding: 0;
  place-items: center;
  border: 0;
  line-height: 1;
}

.chat-composer__add {
  flex: none;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--tago-primary);
  position: relative;
}

.chat-composer__add i {
  position: relative;
  width: 30rpx;
  height: 30rpx;
}

.chat-composer__add i::before,
.chat-composer__add i::after {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 999rpx;
  background: #fff;
  content: '';
  transform: translate(-50%, -50%);
}

.chat-composer__add i::before { width: 30rpx; height: 4rpx; }
.chat-composer__add i::after { width: 4rpx; height: 30rpx; }

.chat-composer__field {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  border-radius: 34rpx;
  background: #f1f0ea;
}

.chat-composer__add::after,
.chat-composer__gift::after,
.chat-composer__send::after { border: 0; }

.chat-composer__gift {
  position: absolute;
  top: 50%;
  right: 14rpx;
  width: 52rpx;
  height: 52rpx;
  transform: translateY(-50%);
  background: transparent;
}

.chat-composer__gift image {
  width: 44rpx;
  height: 44rpx;
}

.chat-composer__input {
  display: block;
  width: 100%;
  min-width: 0;
  height: 69rpx;
  padding: 16rpx 76rpx 16rpx 26rpx;
  border: 0;
  border-radius: 34rpx;
  background: transparent;
  font-size: 25rpx;
  line-height: 1.45;
}

.chat-composer__send {
  flex: none;
  width: 116rpx;
  height: 68rpx;
  color: #fff;
  border-radius: 999rpx;
  background: var(--tago-primary);
  font-size: 25rpx;
  font-weight: 800;
}

.chat-composer__send[disabled] {
  color: #fff;
  background: var(--tago-primary);
  box-shadow: none;
  opacity: .5;
}
</style>
