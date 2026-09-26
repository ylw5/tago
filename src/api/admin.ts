import type { components } from './types/generated'
import { request } from './client'

type S = components['schemas']

export interface AdminUserDto {
  userId: string
  email: string
  status: string
  balance: string
  reserved: string
  available: string
  spendable: string
  recoveryOutstanding: boolean
  governanceVersion: number
}

export interface AdminGiftTierDto {
  code: string
  displayName: string
  price: number
  enabled: boolean
  sortOrder: number
  configVersion: number
}

export interface AdminGiftTierInput {
  displayName: string
  price: number
  enabled: boolean
  sortOrder: number
  expectedVersion: number
}

export type AdjustmentDto = S['AdjustmentView']
export type AdjustmentBatchDto = S['BatchView']
export type AdjustmentBatchItemDto = S['BatchItemView']

export function reauthenticate(body: S['PasswordInput']) {
  return request<S['ReauthenticationView'], S['PasswordInput']>({
    path: '/v1/admin/reauthentication',
    method: 'POST',
    body,
  })
}

export function findAdminUser(email: string) {
  return request<AdminUserDto>({ path: '/v1/admin/users', query: { email } })
}

export function freezeUser(userId: string, expectedGovernanceVersion: number, idempotencyKey?: string) {
  return request<AdminUserDto>({
    path: `/v1/admin/users/${userId}/freeze`,
    method: 'POST',
    idempotent: true,
    idempotencyKey,
    query: { expectedGovernanceVersion },
  })
}

export function unfreezeUser(userId: string, expectedGovernanceVersion: number, idempotencyKey?: string) {
  return request<AdminUserDto>({
    path: `/v1/admin/users/${userId}/unfreeze`,
    method: 'POST',
    idempotent: true,
    idempotencyKey,
    query: { expectedGovernanceVersion },
  })
}

export function createAdjustment(body: S['AdjustmentInput'], idempotencyKey?: string) {
  return request<AdjustmentDto, S['AdjustmentInput']>({
    path: '/v1/admin/wallet/adjustments',
    method: 'POST',
    body,
    idempotent: true,
    idempotencyKey,
  })
}

export function getAdjustment(adjustmentId: string) {
  return request<AdjustmentDto>({ path: `/v1/admin/wallet/adjustments/${adjustmentId}` })
}

export function createAdjustmentBatch(body: S['BatchInput'], idempotencyKey?: string) {
  return request<AdjustmentBatchDto, S['BatchInput']>({
    path: '/v1/admin/wallet/adjustment-batches',
    method: 'POST',
    body,
    idempotent: true,
    idempotencyKey,
  })
}

export function getAdjustmentBatch(batchId: string) {
  return request<AdjustmentBatchDto>({ path: `/v1/admin/wallet/adjustment-batches/${batchId}` })
}

export function listAdjustmentBatchItems(batchId: string) {
  return request<AdjustmentBatchItemDto[]>({
    path: `/v1/admin/wallet/adjustment-batches/${batchId}/items`,
  })
}

export function retryAdjustmentBatch(batchId: string, body: S['RetryInput'], idempotencyKey?: string) {
  return request<AdjustmentBatchDto, S['RetryInput']>({
    path: `/v1/admin/wallet/adjustment-batches/${batchId}/retries`,
    method: 'POST',
    body,
    idempotent: true,
    idempotencyKey,
  })
}

export function listAdminGiftTiers() {
  return request<AdminGiftTierDto[]>({ path: '/v1/admin/gift-tiers' })
}

export async function hasAdminAccess() {
  try {
    await request<AdminGiftTierDto[]>({ path: '/v1/admin/gift-tiers', silent: true })
    return true
  }
  catch {
    return false
  }
}

export function upsertAdminGiftTier(code: string, body: AdminGiftTierInput) {
  return request<AdminGiftTierDto, AdminGiftTierInput>({
    path: `/v1/admin/gift-tiers/${encodeURIComponent(code)}`,
    method: 'PUT',
    body,
  })
}
