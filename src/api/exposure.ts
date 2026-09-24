import type { components } from './types/generated'
import { request } from './client'

export function getCurrentExposure() {
  return request<components['schemas']['ExposureCurrent']>({ path: '/v1/exposure' })
}

export function listExposureBids(query: { limit?: number; cursor?: string } = {}) {
  return request<components['schemas']['ExposureBidPage']>({ path: '/v1/exposure/bids', query })
}

export function createExposureBid(body: components['schemas']['ExposureBidInput'], idempotencyKey?: string, silent = false) {
  return request<components['schemas']['ExposureBidResult'], components['schemas']['ExposureBidInput']>({
    path: '/v1/exposure/bids', method: 'POST', body, idempotent: true, idempotencyKey, silent,
  })
}

export function getExposureBid(bidId: string) {
  return request<components['schemas']['ExposureBid']>({ path: `/v1/exposure/bids/${bidId}` })
}

export function getExposureBidByIdempotencyKey(idempotencyKey: string) {
  return request<components['schemas']['ExposureBid']>({
    path: '/v1/exposure/bids/by-key',
    query: { idempotencyKey },
  })
}

export function getExposureCarousel(query: { limit?: number; cursor?: string } = {}) {
  return request<components['schemas']['ExposureCarouselPage']>({ path: '/v1/exposure/carousel', query })
}

export function getExposureRules() {
  return request<components['schemas']['ExposureRules']>({ path: '/v1/exposure/rules' })
}
