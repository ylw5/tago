import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client'
import {
  createAdjustment,
  freezeUser,
  hasAdminAccess,
  listAdminGiftTiers,
  unfreezeUser,
  upsertAdminGiftTier,
} from './admin'

vi.mock('./client', async (importOriginal) => ({
  ...await importOriginal<typeof import('./client')>(),
  request: vi.fn(),
}))

beforeEach(() => { vi.mocked(request).mockReset() })

describe('admin API adapters', () => {
  it('uses the latest governance version and idempotency key when freezing a user', async () => {
    await freezeUser('user-1', 7, 'freeze-7')

    expect(request).toHaveBeenCalledWith({
      path: '/v1/admin/users/user-1/freeze',
      method: 'POST',
      idempotent: true,
      idempotencyKey: 'freeze-7',
      query: { expectedGovernanceVersion: 7 },
    })
  })

  it('uses the latest governance version when unfreezing a user', async () => {
    await unfreezeUser('user-1', 8, 'unfreeze-8')

    expect(request).toHaveBeenCalledWith({
      path: '/v1/admin/users/user-1/unfreeze',
      method: 'POST',
      idempotent: true,
      idempotencyKey: 'unfreeze-8',
      query: { expectedGovernanceVersion: 8 },
    })
  })

  it('keeps wallet amounts as decimal strings', async () => {
    await createAdjustment({
      email: 'person@example.com',
      amount: '9007199254740993',
      direction: 'CREDIT',
      reasonCode: 'MANUAL',
      reason: '运营补偿',
    }, 'adjustment-1')

    expect(request).toHaveBeenCalledWith({
      path: '/v1/admin/wallet/adjustments',
      method: 'POST',
      body: {
        email: 'person@example.com',
        amount: '9007199254740993',
        direction: 'CREDIT',
        reasonCode: 'MANUAL',
        reason: '运营补偿',
      },
      idempotent: true,
      idempotencyKey: 'adjustment-1',
    })
  })

  it('confirms administrator access without surfacing a denial toast', async () => {
    vi.mocked(request).mockResolvedValueOnce([])

    await expect(hasAdminAccess()).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith({ path: '/v1/admin/gift-tiers', silent: true })
  })

  it('treats a denied administrator read as no access', async () => {
    vi.mocked(request).mockRejectedValueOnce(new ApiError('denied', 'ADMIN_ACCESS_DENIED', 403))

    await expect(hasAdminAccess()).resolves.toBe(false)
  })

  it('reads all gift tiers through the administrator endpoint', async () => {
    await listAdminGiftTiers()

    expect(request).toHaveBeenCalledWith({ path: '/v1/admin/gift-tiers' })
  })

  it('sends the expected version when saving a gift tier', async () => {
    await upsertAdminGiftTier('starter pack', {
      displayName: '小礼物',
      price: 100,
      enabled: true,
      sortOrder: 2,
      expectedVersion: 4,
    })

    expect(request).toHaveBeenCalledWith({
      path: '/v1/admin/gift-tiers/starter%20pack',
      method: 'PUT',
      body: {
        displayName: '小礼物',
        price: 100,
        enabled: true,
        sortOrder: 2,
        expectedVersion: 4,
      },
    })
  })
})
