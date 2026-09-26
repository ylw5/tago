import type { components } from './types/generated'
import { ApiError, request } from './client'

export type PublicIdentityDto = components['schemas']['PublicIdentityView'] & {
  /** Only visible to the account owner; free-form, at most 32 characters. */
  gender?: string | null
  /** ISO date (YYYY-MM-DD). */
  birthDate?: string | null
}
export type AvatarDto = components['schemas']['Avatar']
/** displayName is editable, 1–32 code points, and unique across accounts. */
export type ProfileUpdate = components['schemas']['PublicIdentityUpdate'] & Pick<PublicIdentityDto, 'gender' | 'birthDate'>

const DISPLAY_NAME_LIMIT = 32

export function normalizeDisplayName(value: string) {
  return value.trim()
}

/** Matches PublicIdentityService.normalizeName: stripped, 1–32 code points, no ISO controls. */
export function displayNameIssue(value: string) {
  const name = normalizeDisplayName(value)
  const length = Array.from(name).length
  if (length < 1 || length > DISPLAY_NAME_LIMIT) return '昵称需要 1 到 32 个字'
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return '昵称包含无效字符'
  }
  return ''
}

export function profileUpdateMessage(cause: unknown, fallback = '保存失败') {
  if (cause instanceof ApiError) {
    if (cause.code === 'DISPLAY_NAME_CONFLICT') return '该昵称已被使用，请换一个昵称'
    if (cause.code === 'PUBLIC_IDENTITY_VERSION_CONFLICT') return '资料已更新，请重新确认后再保存'
  }
  return cause instanceof Error && cause.message ? cause.message : fallback
}

export function getProfile() {
  return request<PublicIdentityDto>({ path: '/v1/account/profile' })
}

export function updateProfile(body: ProfileUpdate) {
  return request<PublicIdentityDto, ProfileUpdate>({
    path: '/v1/account/profile', method: 'PUT', body,
  })
}

export function listAvatars() {
  return request<AvatarDto[]>({ path: '/v1/avatars' })
}

export function changePassword(body: components['schemas']['ChangePasswordInput']) {
  return request<components['schemas']['PasswordChangeView'], components['schemas']['ChangePasswordInput']>({
    path: '/v1/account/password', method: 'PUT', body,
  })
}
