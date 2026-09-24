import type { components } from './types/generated'
import { request } from './client'

export type TagDto = components['schemas']['TagView']
export type TagMineDto = components['schemas']['TagMineView']
export type DiscoveryDto = components['schemas']['DiscoveryView']
export type ApplicationDto = components['schemas']['ApplicationView']
export type ApplicationPageDto = components['schemas']['ApplicationPage']
export type TagHistoryPageDto = components['schemas']['TagHistoryPage']
export type TagHistoryDetailDto = components['schemas']['TagHistoryDetail']
export type OperationDto = components['schemas']['OperationView']

export function getDiscovery() { return request<DiscoveryDto>({ path: '/v1/discovery' }) }
export function getMyTag() { return request<TagMineDto>({ path: '/v1/tags/mine' }) }
export function listMyTagHistory(query: { limit?: number; cursor?: string } = {}) { return request<TagHistoryPageDto>({ path: '/v1/tags/history', query }) }
export function getMyTagHistory(tagId: string) { return request<TagHistoryDetailDto>({ path: `/v1/tags/history/detail/${tagId}` }) }
export function getPublicTag(tagId: string) { return request<TagDto>({ path: `/v1/tags/${tagId}` }) }

export function blockUser(userId: string) {
  return request<void>({ path: `/v1/blocks/${userId}`, method: 'POST' })
}

export function unblockUser(userId: string) {
  return request<void>({ path: `/v1/blocks/${userId}`, method: 'DELETE' })
}

export function getOperationStatus(operation: string, idempotencyKey: string) {
  return request<OperationDto>({
    path: '/v1/operations',
    query: { operation, idempotencyKey },
  })
}

export function refreshDiscovery(idempotencyKey?: string) {
  return request<DiscoveryDto>({ path: '/v1/discovery/refresh', method: 'POST', idempotent: true, idempotencyKey })
}

export function createTag(body: components['schemas']['CreateTag'], idempotencyKey?: string) {
  return request<TagDto, components['schemas']['CreateTag']>({
    path: '/v1/tags', method: 'POST', body, idempotent: true, idempotencyKey,
  })
}

export function editTagBody(tagId: string, body: components['schemas']['EditBody']) {
  return request<TagDto, components['schemas']['EditBody']>({
    path: `/v1/tags/${tagId}`, method: 'PUT', body, idempotent: true,
  })
}

export function generateTagQuestions(tagId: string, expectedVersion: number) {
  return request<TagDto, components['schemas']['ExpectedVersion']>({
    path: `/v1/tags/${tagId}/questions/generate`, method: 'POST', body: { expectedVersion }, idempotent: true,
  })
}

export function refreshTagQuestion(tagId: string, slot: number, expectedVersion: number) {
  return request<TagDto, components['schemas']['RefreshQuestion']>({
    path: `/v1/tags/${tagId}/questions/${slot}/refresh`, method: 'POST', body: { expectedVersion }, idempotent: true,
  })
}

export function customizeTagQuestion(tagId: string, slot: number, body: components['schemas']['CustomizeQuestion']) {
  return request<TagDto, components['schemas']['CustomizeQuestion']>({
    path: `/v1/tags/${tagId}/questions/${slot}`, method: 'PUT', body, idempotent: true,
  })
}

export function savePublisherAnswer(tagId: string, slot: number, body: components['schemas']['PublisherAnswer']) {
  return request<TagDto, components['schemas']['PublisherAnswer']>({
    path: `/v1/tags/${tagId}/answers/${slot}`, method: 'PUT', body, idempotent: true,
  })
}

export function publishTag(tagId: string, expectedVersion: number) {
  return request<TagDto, components['schemas']['ExpectedVersion']>({
    path: `/v1/tags/${tagId}/publish`, method: 'POST', body: { expectedVersion }, idempotent: true,
  })
}

export function closeTag(tagId: string) {
  return request<TagDto>({ path: `/v1/tags/${tagId}/close`, method: 'POST', idempotent: true })
}

export function listApplications(query: { direction?: string; state?: string; limit?: number; cursor?: string } = {}) {
  return request<ApplicationPageDto>({ path: '/v1/applications', query })
}

export function getApplication(applicationId: string) {
  return request<ApplicationDto>({ path: `/v1/applications/${applicationId}` })
}

export function submitApplication(tagId: string, body: components['schemas']['SubmitApplication']) {
  return request<ApplicationDto, components['schemas']['SubmitApplication']>({
    path: `/v1/tags/${tagId}/applications`, method: 'POST', body, idempotent: true,
  })
}

export function acceptApplication(applicationId: string) {
  return request<components['schemas']['AcceptanceView']>({
    path: `/v1/applications/${applicationId}/accept`, method: 'POST', idempotent: true,
  })
}

export function rejectApplication(applicationId: string) {
  return request<ApplicationDto>({
    path: `/v1/applications/${applicationId}/reject`, method: 'POST', idempotent: true,
  })
}
