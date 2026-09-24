import type { components } from './types/generated'
import { request } from './client'

export type PublicIdentityDto = components['schemas']['PublicIdentityView'] & {
  /** Only visible to the account owner; free-form, at most 32 characters. */
  gender?: string | null
  /** ISO date (YYYY-MM-DD). */
  birthDate?: string | null
}
export type AvatarDto = components['schemas']['Avatar']
/** displayName must equal the current name: the backend rejects renames with DISPLAY_NAME_IMMUTABLE. */
export type ProfileUpdate = components['schemas']['PublicIdentityUpdate'] & Pick<PublicIdentityDto, 'gender' | 'birthDate'>

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
