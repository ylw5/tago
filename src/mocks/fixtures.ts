import type { ConversationRowMeta } from '@/api/adapters'

interface FixtureRequest {
  method: string
  path: string
  query?: Record<string, unknown>
  body?: unknown
}

interface FixtureResponse {
  status: number
  data?: unknown
}

export class FixtureMissingError extends Error {
  constructor(request: FixtureRequest) {
    super(`No fixture for ${request.method} ${request.path}`)
    this.name = 'FixtureMissingError'
  }
}

export async function resolveFixture(request: FixtureRequest): Promise<FixtureResponse> {
  throw new FixtureMissingError(request)
}

export const conversationRowMeta: Record<string, ConversationRowMeta> = {}
