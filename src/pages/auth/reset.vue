<script setup lang="ts">
import AuthField from '@/components/auth/AuthField.vue'
import AuthShell from '@/components/auth/AuthShell.vue'
import { useAuthFlow } from '@/composables/useAuthFlow'
import { goBack } from '@/utils/navigation'

const { form, challengeId, retryAfter, submitting, error, message, passwordMatches, requestCode, verify } = useAuthFlow('reset')
async function submit() { if (await verify()) setTimeout(() => uni.redirectTo({ url:'/pages/auth/login' }), 700) }
</script>

<template>
  <AuthShell back title="重新找回密码" subtitle="验证邮箱后，设置一个新的密码" @back="goBack">
    <form @submit="submit">
      <AuthField v-model="form.email" label="邮箱" placeholder="请输入注册邮箱" />
      <view class="code-line">
        <AuthField v-model="form.code" label="验证码" type="number" placeholder="6 位验证码" :maxlength="6" />
        <button type="button" :disabled="submitting || retryAfter > 0" @click="requestCode">{{ retryAfter > 0 ? `${retryAfter}s` : challengeId ? '重新发送' : '发送验证码' }}</button>
      </view>
      <AuthField v-model="form.password" label="新密码" type="password" placeholder="至少 8 位密码" />
      <AuthField v-model="form.confirmPassword" label="确认密码" type="password" placeholder="再次输入新密码" :error="passwordMatches ? '' : '两次输入的密码不一致'" />
      <text v-if="message" class="auth-message">{{ message }}</text><text v-if="error" class="auth-message auth-message--error">{{ error }}</text>
      <button class="auth-submit" :loading="submitting" form-type="submit">确认重置</button>
    </form>
  </AuthShell>
</template>

<style scoped lang="scss">
.code-line{position:relative}.code-line :deep(.field__input){padding-right:128px}.code-line>button{position:absolute;right:10px;bottom:4px;height:36px;padding:0 16px;color:var(--tago-primary);border-radius:999rpx;background:var(--tago-note-yellow);font-size:14px;line-height:36px}.code-line>button::after{border:0}.code-line>button[disabled]{opacity:.55}.auth-submit{height:86rpx;margin-top:24rpx;color:#fff;border-radius:999rpx;background:var(--tago-primary);font-size:30rpx;font-weight:800;line-height:86rpx}.auth-message{display:block;margin:12rpx 4rpx 0;color:var(--tago-primary);font-size:21rpx}.auth-message--error{color:var(--tago-danger)}
</style>
