<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import WdPopup from 'wot-design-uni/components/wd-popup/wd-popup.vue'
import AuthEntryField from './AuthEntryField.vue'
import AuthStage from './AuthStage.vue'
import { useAuthFlow } from '@/composables/useAuthFlow'

type AuthMode = 'login' | 'register'

const props = withDefaults(defineProps<{
  initialMode: AuthMode
  redirect?: string
}>(), {
  redirect: '/pages/discover/index',
})

const activeMode = shallowRef<AuthMode>(props.initialMode)
const title = computed(() => activeMode.value === 'login' ? '登录你的账号' : '创建你的账号')
const subtitle = computed(() => activeMode.value === 'login' ? '继续更多有趣的相遇' : '开启更多有趣的相遇')

const loginFlow = useAuthFlow()
const registerFlow = useAuthFlow('register')

const agreed = registerFlow.agreementAccepted
const agreementOpen = shallowRef(false)
watch(activeMode, (mode) => {
  agreementOpen.value = false
  if (mode === 'register') void registerFlow.loadAgreement()
}, { immediate: true })
const shaking = shallowRef(false)
const hint = shallowRef('')
const mismatch = computed(() => !!registerFlow.form.confirmPassword && !registerFlow.passwordMatches.value)
const registerNotice = computed(() => hint.value || (mismatch.value ? '两次输入的密码不一致' : '') || registerFlow.error.value || registerFlow.message.value)
const registerFailed = computed(() => !hint.value && !mismatch.value && !!registerFlow.error.value)
const codeLocked = computed(() => registerFlow.submitting.value || registerFlow.retryAfter.value > 0)
const codeLabel = computed(() => registerFlow.retryAfter.value > 0 ? `${registerFlow.retryAfter.value}s` : registerFlow.challengeId.value ? '重新发送' : '发送验证码')

function selectMode(mode: AuthMode) {
  if (mode === activeMode.value) return
  loginFlow.reset()
  registerFlow.reset()
  agreed.value = false
  shaking.value = false
  hint.value = ''
  activeMode.value = mode
}
function goBack() { uni.redirectTo({ url: '/pages/auth/welcome' }) }
function openReset() { uni.navigateTo({ url: '/pages/auth/reset' }) }

async function submitLogin() {
  if (await loginFlow.signIn()) uni.reLaunch({ url: props.redirect })
}

async function confirmRecovery() {
  if (await loginFlow.recover()) uni.reLaunch({ url: props.redirect })
}

function toggleAgree() {
  agreed.value = !agreed.value
  hint.value = ''
}

function bounceAgreement() {
  shaking.value = false
  setTimeout(() => { shaking.value = true }, 20)
}

async function submitRegister() {
  if (!agreed.value) {
    hint.value = '请先勾选同意《注册协议》'
    bounceAgreement()
    return
  }
  if (!await registerFlow.verify()) return
  if (registerFlow.loginRequired.value) {
    const email = registerFlow.form.email
    selectMode('login')
    loginFlow.form.email = email
    uni.showToast({ title: '注册成功，请登录', icon: 'none' })
    return
  }
  uni.reLaunch({ url: props.redirect })
}
</script>

<template>
  <AuthStage :active="activeMode" :title="title" :subtitle="subtitle" @back="goBack" @select="selectMode">
    <form v-show="activeMode === 'login'" class="auth-form auth-form--login" @submit="submitLogin">
      <view class="auth-form__fields auth-form__fields--login">
        <AuthEntryField v-model="loginFlow.form.email" icon="mail" placeholder="输入邮箱地址" />
        <AuthEntryField v-model="loginFlow.form.password" icon="lock" type="password" placeholder="输入密码" />
      </view>

      <button class="auth-form__forgot" type="button" hover-class="text-link--pressed" @click="openReset">忘记密码？</button>
      <text v-if="loginFlow.error.value && !loginFlow.recoveryRequestId.value" class="auth-form__message auth-form__message--error">{{ loginFlow.error.value }}</text>
      <button v-if="loginFlow.recoveryRequestId.value" class="auth-form__recovery" type="button" @click="confirmRecovery">当前账号登录设备已满，撤销其他登录并继续</button>
      <button class="auth-form__submit auth-form__submit--login" :loading="loginFlow.submitting.value" :disabled="loginFlow.submitting.value" form-type="submit" hover-class="auth-form__submit--pressed">
        {{ loginFlow.submitting.value ? '登录中' : '登录并继续' }}
      </button>
      <view class="auth-form__switch auth-form__switch--login"><text>还没有账号？</text><button type="button" hover-class="text-link--pressed" @click="selectMode('register')">立即注册</button></view>
    </form>

    <form v-show="activeMode === 'register'" class="auth-form auth-form--register" @submit="submitRegister">
      <view class="auth-form__fields auth-form__fields--register">
        <AuthEntryField v-model="registerFlow.form.email" icon="mail" placeholder="输入邮箱地址" />
        <AuthEntryField v-model="registerFlow.form.code" type="number" placeholder="邮箱验证码" :maxlength="6" :action-label="codeLabel" :action-disabled="codeLocked" @action="registerFlow.requestCode" />
        <AuthEntryField v-model="registerFlow.form.password" icon="lock" type="password" placeholder="输入密码（至少8位）" />
        <AuthEntryField v-model="registerFlow.form.confirmPassword" icon="lock" type="password" placeholder="确认密码" />
      </view>

      <button class="auth-form__agreement" :class="{ 'auth-form__agreement--shaking': shaking }" :disabled="!registerFlow.agreement.value || registerFlow.submitting.value" :aria-pressed="agreed" type="button" hover-class="text-link--pressed" @click="toggleAgree">
        <view class="auth-form__check" :class="{ 'auth-form__check--active': agreed }"><text v-if="agreed">✓</text></view>
        <text>我已阅读并同意《注册协议》</text>
      </button>

      <button class="auth-form__agreement-link" type="button" :disabled="registerFlow.agreementLoading.value || registerFlow.submitting.value" :aria-expanded="agreementOpen" @click="registerFlow.agreement.value ? agreementOpen = !agreementOpen : registerFlow.loadAgreement()">
        {{ registerFlow.agreementLoading.value ? '协议加载中…' : !registerFlow.agreement.value ? '重试加载协议' : agreementOpen ? '收起注册协议' : '查看注册协议' }}
      </button>

      <text v-if="registerNotice" class="auth-form__message auth-form__message--register" :class="{ 'auth-form__message--error': registerFailed || hint || mismatch }">{{ registerNotice }}</text>
      <button class="auth-form__submit auth-form__submit--register" :loading="registerFlow.submitting.value" :disabled="registerFlow.submitting.value || !registerFlow.agreement.value || registerFlow.agreementLoading.value" form-type="submit" hover-class="auth-form__submit--pressed">{{ registerFlow.submitting.value ? '注册中' : '注册并继续' }}</button>
      <view class="auth-form__switch auth-form__switch--register"><text>已有账号？</text><button type="button" hover-class="text-link--pressed" @click="selectMode('login')">直接登录</button></view>
    </form>
  </AuthStage>
  <WdPopup v-model="agreementOpen" position="bottom" safe-area-inset-bottom>
    <view role="dialog" aria-modal="true" aria-label="注册协议" @keydown.esc="agreementOpen = false">
      <button type="button" class="auth-form__agreement-link" @click="agreementOpen = false">关闭注册协议</button>
      <scroll-view scroll-y class="auth-form__agreement-body">
        <text selectable>{{ registerFlow.agreement.value?.body }}</text>
      </scroll-view>
    </view>
  </WdPopup>
</template>

<style scoped lang="scss">
.auth-form { display: block; width: 100%; }
.auth-form__fields { display: grid; }
.auth-form__fields--login { gap: 16rpx; }
.auth-form__fields--register { gap: 12rpx; }
.text-link--pressed { opacity: .58; }

.auth-form__forgot { display: block; width: max-content; height: 54rpx; margin: 8rpx 0 18rpx auto; padding: 0 10rpx; color: #1760a0; border: 0; background: transparent; font-family: inherit; font-size: 25rpx; font-weight: 700; line-height: 54rpx; }
.auth-form__forgot::after, .auth-form__switch button::after, .auth-form__agreement::after { border: 0; }
.auth-form__message { display: block; min-height: 34rpx; margin: -8rpx 10rpx 10rpx; font-size: 22rpx; line-height: 1.35; text-align: center; }
.auth-form__message--register { min-height: 28rpx; margin: -2rpx 8rpx 2rpx; color: var(--tago-primary); font-size: 19rpx; line-height: 1.25; }
.auth-form__message--error { color: var(--tago-danger); }
.auth-form__recovery { min-height: 56rpx; margin: -8rpx 0 10rpx; padding: 8rpx 20rpx; color: var(--tago-danger); border: 2rpx solid rgba(233, 96, 82, .45); border-radius: 18rpx; background: rgba(255, 253, 247, .82); font-size: 21rpx; line-height: 1.35; }

.auth-form__submit { width: 100%; color: #fffdf7; border: 0; border-radius: 999rpx; background: #145c50; box-shadow: 0 12rpx 26rpx rgba(26, 83, 69, .16), inset 0 0 20rpx rgba(255, 255, 255, .05); font-family: inherit; font-weight: 800; letter-spacing: 3rpx; transition: transform .18s ease, background-color .18s ease; }
.auth-form__submit::after { border: 0; }
.auth-form__submit--login { height: 92rpx; margin-top: 24rpx; font-size: 34rpx; line-height: 92rpx; }
.auth-form__submit--register { height: 88rpx; margin-top: 8rpx; font-size: 33rpx; line-height: 88rpx; }
.auth-form__submit--pressed { background: #104c43; transform: scale(.985); }
.auth-form__submit[disabled] { opacity: .7; }

.auth-form__switch { display: flex; align-items: center; justify-content: center; color: #0b4f57; font-weight: 650; }
.auth-form__switch--login { margin-top: 22rpx; font-size: 25rpx; }
.auth-form__switch--register { margin-top: 8rpx; font-size: 23rpx; }
.auth-form__switch button { height: 58rpx; margin: 0; padding: 0 8rpx; color: #086ad8; border: 0; background: transparent; font-family: inherit; font-size: inherit; font-weight: 800; line-height: 58rpx; }

.auth-form__agreement { display: flex; width: 100%; min-height: 60rpx; align-items: center; justify-content: center; margin: 10rpx 0 0; padding: 0; color: #0b4f57; border: 0; background: transparent; font-family: inherit; font-size: 21rpx; font-weight: 700; line-height: 1.25; white-space: nowrap; }
.auth-form__check { display: flex; width: 44rpx; height: 44rpx; flex: 0 0 44rpx; align-items: center; justify-content: center; margin-right: 10rpx; color: #fff; border: 3rpx solid #146258; border-radius: 50%; font-size: 30rpx; font-weight: 900; line-height: 1; }
.auth-form__check--active { background: #146258; }
.auth-form__agreement-link { margin: 0 auto 8rpx; padding: 0 12rpx; color: #086ad8; background: transparent; font-size: 22rpx; line-height: 48rpx; }
.auth-form__agreement-link::after { border: 0; }
.auth-form__agreement-body { height: 60vh; margin-bottom: 16rpx; padding: 16rpx; box-sizing: border-box; background: #fffdf7; border-radius: 12rpx; font-size: 24rpx; line-height: 1.6; white-space: pre-wrap; }
.auth-form__agreement--shaking { animation: agree-shake .32s ease; }

@keyframes agree-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10rpx); } 75% { transform: translateX(10rpx); } }
</style>
