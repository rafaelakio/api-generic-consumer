import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }))
vi.mock('@/services/http.service', () => ({ executeRequest: vi.fn() }))

import { getToken } from 'next-auth/jwt'
import { executeRequest } from '@/services/http.service'
import type { ApiResponse } from '@/types'

const mockedGetToken = vi.mocked(getToken)
const mockedExecute = vi.mocked(executeRequest)

function makeReq(body: unknown) {
  return {
    json: async () => body,
    headers: new Headers(),
    cookies: { get: () => undefined },
  } as unknown as import('next/server').NextRequest
}

const validRequest = {
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: [],
  body: '',
  bypassSsl: false,
}

const mockApiResponse: ApiResponse = {
  statusCode: 200,
  statusText: 'OK',
  headers: {},
  body: { ok: true },
  responseTimeMs: 50,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/proxy – auth', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetToken.mockResolvedValueOnce(null)

    const { POST } = await import('../route')
    const res = await POST(makeReq({ request: validRequest }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })
})

describe('POST /api/proxy – request parsing', () => {
  it('returns 400 when body is not valid JSON', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const badReq = {
      json: async () => { throw new SyntaxError('bad json') },
      headers: new Headers(),
      cookies: { get: () => undefined },
    } as unknown as import('next/server').NextRequest

    const { POST } = await import('../route')
    const res = await POST(badReq)

    expect(res.status).toBe(400)
  })

  it('returns 422 when request schema validation fails', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ request: { url: 'not-a-url', method: 'GET' } }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('Validation failed')
  })

  it('returns 422 for unsupported HTTP method', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })

    const { POST } = await import('../route')
    const res = await POST(makeReq({ request: { ...validRequest, method: 'HEAD' } }))

    expect(res.status).toBe(422)
  })
})

describe('POST /api/proxy – successful execution', () => {
  it('returns 200 with api response data', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })
    mockedExecute.mockResolvedValueOnce(mockApiResponse)

    const { POST } = await import('../route')
    const res = await POST(makeReq({ request: validRequest }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.statusCode).toBe(200)
    expect(json.data.body).toEqual({ ok: true })
  })

  it('delegates to executeRequest with validated data', async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: 'user' })
    mockedExecute.mockResolvedValueOnce(mockApiResponse)

    const { POST } = await import('../route')
    await POST(makeReq({ request: validRequest }))

    expect(mockedExecute).toHaveBeenCalledWith(
      expect.objectContaining({ url: validRequest.url, method: 'GET' }),
    )
  })

  it('accepts all valid HTTP methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
    for (const method of methods) {
      mockedGetToken.mockResolvedValueOnce({ sub: 'user' })
      mockedExecute.mockResolvedValueOnce(mockApiResponse)

      const { POST } = await import('../route')
      const res = await POST(makeReq({ request: { ...validRequest, method } }))
      expect(res.status).toBe(200)
    }
  })
})
