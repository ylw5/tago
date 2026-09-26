<script setup lang="ts">
import mailIcon from '@/static/auth/icon-mail.svg'
import lockIcon from '@/static/auth/icon-lock.svg'

withDefaults(defineProps<{
  type?: 'text' | 'password' | 'number'
  icon?: 'mail' | 'lock' | 'none'
  placeholder: string
  maxlength?: number
  actionLabel?: string
  actionDisabled?: boolean
}>(), {
  type: 'text',
  icon: 'none',
  maxlength: 128,
  actionLabel: '',
  actionDisabled: false,
})

const model = defineModel<string>({ required: true })
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <label class="entry-field">
    <image v-if="icon !== 'none'" class="entry-field__icon" :src="icon === 'mail' ? mailIcon : lockIcon" mode="aspectFit" />
    <input
      v-model="model"
      class="entry-field__input"
      :class="{ 'entry-field__input--with-action': actionLabel }"
      :type="type === 'number' ? 'number' : 'text'"
      :password="type === 'password'"
      :maxlength="maxlength"
      :placeholder="placeholder"
      placeholder-class="entry-field__placeholder"
    />
    <button
      v-if="actionLabel"
      class="entry-field__action"
      type="button"
      :disabled="actionDisabled"
      hover-class="entry-field__action--pressed"
      @click.prevent="emit('action')"
    >{{ actionLabel }}</button>
  </label>
</template>

<style scoped lang="scss">
.entry-field {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 88rpx;
  align-items: center;
  gap: 22rpx;
  padding: 0 28rpx;
  border: 2rpx solid rgba(255, 255, 255, .78);
  border-radius: 24rpx;
  background: rgba(255, 253, 247, .93);
  box-shadow: 0 9rpx 22rpx rgba(71, 92, 72, .09), inset 0 0 18rpx rgba(173, 148, 97, .045);
}

.entry-field:focus-within {
  border-color: rgba(32, 88, 79, .32);
  box-shadow: 0 10rpx 24rpx rgba(49, 82, 65, .12), 0 0 0 4rpx rgba(32, 88, 79, .08);
}

.entry-field__icon { width: 48rpx; height: 48rpx; flex: 0 0 48rpx; }

.entry-field__input {
  min-width: 0;
  height: 88rpx;
  flex: 1;
  padding: 0;
  color: #174f53;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 30rpx;
  font-weight: 650;
}

.entry-field__placeholder { color: #7184a0; }
.entry-field__input--with-action { padding-right: 8rpx; }

.entry-field__action {
  height: 62rpx;
  flex: 0 0 auto;
  padding: 0 24rpx;
  color: #17665f;
  border: 3rpx solid #17665f;
  border-radius: 19rpx;
  background: rgba(255, 253, 247, .72);
  font-family: inherit;
  font-size: 25rpx;
  font-weight: 750;
  line-height: 58rpx;
  transition: transform .18s ease, background-color .18s ease;
}

.entry-field__action::after { border: 0; }
.entry-field__action--pressed { background: rgba(32, 88, 79, .1); transform: scale(.97); }
.entry-field__action[disabled] { opacity: .5; }
</style>
