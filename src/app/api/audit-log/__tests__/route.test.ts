import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }))

import { getToken } from 'next-auth/jwt'

const mockedGetToken = vi.mocked(getToken)

function makeReq(body: unknown) {
  return {
    json: async () => body,
    headers: new Headers(),
    cookies: { get: () => undefined },
  } as unknown as import('next/server').NextRequest
}

const validEntry = {
  changeNumber: 'CHG0001',
  level: 'CALL',
  message: 'GET https://api.example.com/data → 200 (150ms)',
  timestamp: '2024-01-15T08:10:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'table').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/audit-log – auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedGetToken.mockResolvedValueOnce(null)

    const { POST } = await import('../route')
    const res = await POST(makeReq(validEntry))

    expect(res.status).toBe(401)
  })
})

describe('POST /api/audit-log – parsing', () => {
  it('returns 400 on invalid JSON body', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const badReq = {
      json: async () => { throw new SyntaxError('bad') },
      headers: new Headers(),
      cookies: { get: () => undefined },
    } as unknown as import('next/server').NextRequest

    const { POST } = await import('../route')
    const res = await POST(badReq)

    expect(res.status).toBe(400)
  })

  it('returns 422 on schema validation failure', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ level: 'UNKNOWN_LEVEL', message: 'x', timestamp: 't' }))

    expect(res.status).toBe(422)
  })
})

describe('POST /api/audit-log – log levels', () => {
  it('returns 200 for CALL level', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq(validEntry))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(console.log).toHaveBeenCalled()
  })

  it('handles SESSION_OPEN level', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ ...validEntry, level: 'SESSION_OPEN' }))

    expect(res.status).toBe(200)
    expect(console.log).toHaveBeenCalled()
  })

  it('handles SESSION_CLOSE level', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ ...validEntry, level: 'SESSION_CLOSE' }))

    expect(res.status).toBe(200)
  })

  it('handles SESSION_SUMMARY level with table', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({
      ...validEntry,
      level: 'SESSION_SUMMARY',
      table: [{ seq: 1, url: 'https://x.com', method: 'GET' }],
    }))

    expect(res.status).toBe(200)
    expect(console.table).toHaveBeenCalled()
  })

  it('handles SESSION_SUMMARY level without table', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ ...validEntry, level: 'SESSION_SUMMARY' }))

    expect(res.status).toBe(200)
    expect(console.table).not.toHaveBeenCalled()
  })

  it('handles FULL_REPORT level', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ ...validEntry, level: 'FULL_REPORT', message: '=== REPORT ===' }))

    expect(res.status).toBe(200)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('=== REPORT ==='))
  })
})
