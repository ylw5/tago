import { beforeEach, expect, it, vi } from 'vitest'
import { listApplications } from '@/api/social'
import { useApplicationsData } from './useApplicationsData'

vi.mock('@/api/social', () => ({
  listApplications: vi.fn(async ({ direction }) => ({ items: direction === 'INCOMING' ? [{ id: 'received' }] : [{ id: 'sent' }] })),
  acceptApplication: vi.fn(),
  rejectApplication: vi.fn(),
}))
vi.mock('@/api/adapters', () => ({ applicationDtoToItem: (item: unknown) => item }))
vi.mock('./useBackendSession', () => ({ ensureBackendSession: vi.fn(async () => {}) }))

beforeEach(() => { vi.clearAllMocks() })

it('shows only received pending applications', async () => {
  const data = useApplicationsData()
  await data.load()
  expect(listApplications).toHaveBeenCalledWith({ direction: 'INCOMING', state: 'PENDING', limit: 30 })
  expect(data.applications.value.map(item => item.id)).toEqual(['received'])
})
