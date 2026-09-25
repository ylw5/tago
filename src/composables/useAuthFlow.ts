import { computed, reactive, readonly, shallowRef } from 'vue'
import { getProfile, updateProfile } from '@/api/account'
import { getRegistrationAgreement, getSession, login, recoverLogin, register, requestPasswordResetCode, requestRegistrationCode, resetPassword } from '@/api/auth'
import { ApiError } from '@/api/client'
import { useUserStore } from '@/stores/user'

type Mode = 'register' | 'reset'

export function useAuthFlow(mode?: Mode) {
  const userStore = useUserStore()
  const form = reactive({ email: '', password: '', confirmPassword: '', code: '', nickname: '' })
  const challengeId = shallowRef('')
  const retryAfter = shallowRef(0)
  const submitting = shallowRef(false)
  const message = shallowRef('')
  const error = shallowRef('')
  const recoveryRequestId = shallowRef('')
  const agreement = shallowRef<{ version: string; body: string } | null>(null)
  const agreementAccepted = shallowRef(false)
  const agreementLoading = shallowRef(false)
  const loginRequired = shallowRef(false)
  let countdownTimer: ReturnType<typeof setInterval> | undefined

  async function loadAgreement() {
    if (agreementLoading.value) return
    agreementAccepted.value = false
    agreement.value = null
    agreementLoading.value = true
    error.value = ''
    try {
      const result = await getRegistrationAgreement()
      if (!result.version || !result.body) throw new Error('注册协议不完整')
      agreement.value = { version: result.version, body: result.body }
    }
    catch { error.value = '注册协议加载失败，请重试' }
    finally { agreementLoading.value = false }
  }

  const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
  const passwordValid = computed(() => Array.from(form.password).length >= 8)
  const passwordMatches = computed(() => !form.confirmPassword || form.password === form.confirmPassword)
  const canRequestCode = computed(() => emailValid.value && retryAfter.value <= 0 && !submitting.value)
  const canVerify = computed(() => Boolean(challengeId.value && /^\d{6}$/.test(form.code.trim()) && passwordValid.value && passwordMatches.value))

  function beginCountdown(seconds: number) {
    if (countdownTimer) clearInterval(countdownTimer)
    retryAfter.value = seconds
    countdownTimer = setInterval(() => {
      retryAfter.value -= 1
      if (retryAfter.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = undefined
      }
    }, 1000)
  }

  function reset() {
    Object.assign(form, { email: '', password: '', confirmPassword: '', code: '', nickname: '' })
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = undefined
    challengeId.value = ''
    retryAfter.value = 0
    submitting.value = false
    message.value = ''
    error.value = ''
    recoveryRequestId.value = ''
    agreementAccepted.value = false
    loginRequired.value = false
  }

  async function run<T>(task: () => Promise<T>) {
    submitting.value = true
    error.value = ''
    message.value = ''
    try { return await task() }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '请求没有完成，请稍后再试'
      throw cause
    }
    finally { submitting.value = false }
  }

  async function signIn() {
    if (!emailValid.value || !passwordValid.value) {
      error.value = '请输入有效邮箱和至少 8 位密码'
      return false
    }
    return run(async () => {
      const session = await login({ email: form.email.trim(), password: form.password })
      userStore.setSession(session)
      return true
    }).catch((cause) => {
      if (cause instanceof ApiError && cause.code === 'LOGIN_CAPACITY_EXCEEDED') {
        const details = cause.details as { recoveryRequestId?: string } | undefined
        recoveryRequestId.value = details?.recoveryRequestId || ''
        error.value = '当前账号登录设备已满，请在其他设备退出后重试。'
      }
      return false
    })
  }

  async function recover() {
    if (!recoveryRequestId.value) return false
    return run(async () => {
      const session = await recoverLogin({ email:form.email.trim(), password:form.password, recoveryRequestId:recoveryRequestId.value, confirm:true })
      userStore.setSession(session)
      recoveryRequestId.value = ''
      return true
    }).catch(() => false)
  }

  async function requestCode() {
    if (!mode) return false
    if (!emailValid.value) {
      error.value = '请输入有效邮箱后再获取验证码'
      return false
    }
    if (!canRequestCode.value) return false
    return run(async () => {
      const result = mode === 'register'
        ? await requestRegistrationCode({ email: form.email.trim() })
        : await requestPasswordResetCode({ email: form.email.trim() })
      challengeId.value = result.challengeId
      beginCountdown(result.retryAfterSeconds)
      message.value = `验证码已发送，有效期 ${Math.ceil(result.expiresInSeconds / 60)} 分钟`
      return true
    }).catch(() => false)
  }

  async function verify() {
    if (!mode) return false
    if (mode === 'register' && (!agreement.value || !agreementAccepted.value)) {
      error.value = '请先加载并同意注册协议'
      return false
    }
    if (!challengeId.value) {
      error.value = '请先发送并获取邮箱验证码'
      return false
    }
    if (!/^\d{6}$/.test(form.code.trim())) {
      error.value = '请输入邮件中的 6 位验证码'
      return false
    }
    if (!passwordValid.value) {
      error.value = '密码至少需要 8 位'
      return false
    }
    if (!passwordMatches.value) {
      error.value = '两次输入的密码不一致'
      return false
    }
    return run(async () => {
      const payload = { challengeId: challengeId.value, code: form.code.trim(), email: form.email.trim(), password: form.password }
      if (mode === 'reset') {
        await resetPassword(payload)
        message.value = '密码已重置，请使用新密码登录'
        return true
      }

      const result = await register({ ...payload, agreementVersion: agreement.value!.version, agreementAccepted: agreementAccepted.value })
      userStore.clear()
      loginRequired.value = !result.authenticated || result.nextAction === 'LOGIN'
      if (loginRequired.value) return true
      try {
        const session = await getSession()
        userStore.setSession(session)
        loginRequired.value = !session.authenticated
      }
      catch { loginRequired.value = true }
      if (loginRequired.value) return true
      if (form.nickname.trim()) {
        const profile = await getProfile()
        await updateProfile({ displayName: form.nickname.trim(), avatarId: profile.avatarId, expectedVersion: profile.version })
      }
      return true
    }).catch(async (cause) => {
      if (mode === 'register' && cause instanceof ApiError && cause.code === 'REGISTRATION_AGREEMENT_REQUIRED') {
        await loadAgreement()
        if (agreement.value) error.value = '注册协议已更新，请阅读并重新勾选同意'
      }
      return false
    })
  }

  return {
    form,
    challengeId: readonly(challengeId),
    retryAfter: readonly(retryAfter),
    submitting: readonly(submitting),
    message: readonly(message),
    error: readonly(error),
    recoveryRequestId: readonly(recoveryRequestId),
    agreement: readonly(agreement),
    agreementAccepted,
    agreementLoading: readonly(agreementLoading),
    loginRequired: readonly(loginRequired),
    loadAgreement,
    emailValid,
    passwordValid,
    passwordMatches,
    canRequestCode,
    canVerify,
    reset,
    signIn,
    recover,
    requestCode,
    verify,
  }
}
