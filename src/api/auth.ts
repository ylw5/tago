import type { components } from './types/generated'
import { clearCsrf, request } from './client'

type LoginInput = components['schemas']['LoginInput']
type RecoveryInput = components['schemas']['RecoveryInput']
type VerificationInput = components['schemas']['VerificationInput']
type RegistrationInput = components['schemas']['RegistrationInput']
type AgreementView = components['schemas']['AgreementView']
type EmailInput = components['schemas']['EmailInput']
type SessionView = components['schemas']['SessionView']
type RegistrationView = components['schemas']['RegistrationView']
type CodeRequest = components['schemas']['CodeRequest']
type LogoutView = components['schemas']['LogoutView']

export function getSession() {
  return request<SessionView>({ path: '/v1/auth/session', silent: true, csrf: false })
}

export async function login(body: LoginInput) {
  await request<void, LoginInput>({ path: '/v1/auth/login', method: 'POST', body, silent: true })
  clearCsrf()
  return getSession()
}

export async function recoverLogin(body: RecoveryInput) {
  await request<void, RecoveryInput>({ path: '/v1/auth/login/recover', method: 'POST', body })
  clearCsrf()
  return getSession()
}

export async function logout() {
  const result = await request<LogoutView>({ path: '/v1/auth/logout', method: 'POST' })
  clearCsrf()
  return result
}

export async function logoutAll() {
  const result = await request<LogoutView>({ path: '/v1/auth/logout-all', method: 'POST' })
  clearCsrf()
  return result
}

export function requestRegistrationCode(body: EmailInput) {
  return request<CodeRequest, EmailInput>({ path: '/v1/auth/registration-codes', method: 'POST', body })
}

export function getRegistrationAgreement() {
  return request<AgreementView>({ path: '/v1/auth/registration-agreement', csrf: false, silent: true })
}

export async function register(body: RegistrationInput) {
  const result = await request<RegistrationView, RegistrationInput>({ path: '/v1/auth/register', method: 'POST', body })
  clearCsrf()
  return result
}

export function requestPasswordResetCode(body: EmailInput) {
  return request<CodeRequest, EmailInput>({ path: '/v1/auth/password-reset-codes', method: 'POST', body })
}

export function resetPassword(body: VerificationInput) {
  return request<void, VerificationInput>({ path: '/v1/auth/password-reset', method: 'POST', body })
}
