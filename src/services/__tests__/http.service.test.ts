import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import type { ApiRequest } from '@/types'

vi.mock('axios')
vi.mock('../secrets.service', () => ({
  getApiCredentials: vi.fn(),
}))
vi.mock('../oauth.service', () => ({
  getClientCredentialsToken: vi.fn(),
}))

import { getApiCredentials } from '../secrets.service'
import { getClientCredentialsToken } from '../oauth.service'

const mockedAxios = vi.mocked(axios)
const mockedGetCredentials = vi.mocked(getApiCredentials)
const mockedGetToken = vi.mocked(getClientCredentialsToken)

const baseRequest: ApiRequest = {
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: [],
  body: '',
  bypassSsl: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetCredentials.mockRejectedValue(new Error('no credentials'))
})

describe('executeRequest – successful responses', () => {
  it('returns response data for successful GET', async () => {
    mockedAxios.mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { success: true },
    })

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.statusCode).toBe(200)
    expect(result.statusText).toBe('OK')
    expect(result.body).toEqual({ success: true })
    expect(result.error).toBeUndefined()
  })

  it('returns 4xx as a real response (not thrown)', async () => {
    mockedAxios.mockResolvedValueOnce({
      status: 404,
      statusText: 'Not Found',
      headers: {},
      data: { error: 'not found' },
    })

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.statusCode).toBe(404)
    expect(result.error).toBeUndefined()
  })

  it('includes responseTimeMs', async () => {
    mockedAxios.mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: null,
    })

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('normalizes array header values to joined string', async () => {
    mockedAxios.mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      headers: { 'set-cookie': ['a=1', 'b=2'] },
      data: null,
    })

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.headers['set-cookie']).toBe('a=1, b=2')
  })
})

describe('executeRequest – headers', () => {
  it('includes enabled headers', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: null })

    const req: ApiRequest = {
      ...baseRequest,
      headers: [
        { key: 'X-Custom', value: 'yes', enabled: true },
        { key: 'X-Disabled', value: 'no', enabled: false },
      ],
    }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0]
    expect((config as Record<string, unknown>).headers).toMatchObject({ 'X-Custom': 'yes' })
    expect((config as Record<string, unknown>).headers).not.toHaveProperty('X-Disabled')
  })

  it('trims whitespace from header keys', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: null })

    const req: ApiRequest = {
      ...baseRequest,
      headers: [{ key: '  Authorization  ', value: 'Bearer x', enabled: true }],
    }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0]
    expect((config as Record<string, unknown>).headers).toMatchObject({ Authorization: 'Bearer x' })
  })

  it('skips headers with empty keys', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: null })

    const req: ApiRequest = {
      ...baseRequest,
      headers: [{ key: '   ', value: 'value', enabled: true }],
    }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0] as Record<string, Record<string, string>>
    expect(Object.keys(config.headers)).toHaveLength(0)
  })
})

describe('executeRequest – SSL', () => {
  it('sets rejectUnauthorized=false when bypassSsl=true', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: null })

    const { executeRequest } = await import('../http.service')
    await executeRequest({ ...baseRequest, bypassSsl: true })

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    const agent = config.httpsAgent as { options?: { rejectUnauthorized?: boolean } }
    expect(agent.options?.rejectUnauthorized).toBe(false)
  })

  it('sets custom CA when certificate is provided', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: null })

    const { executeRequest } = await import('../http.service')
    await executeRequest({ ...baseRequest, certificate: '-----BEGIN CERTIFICATE-----' })

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    const agent = config.httpsAgent as { options?: { ca?: string } }
    expect(agent.options?.ca).toBe('-----BEGIN CERTIFICATE-----')
  })

  it('uses no httpsAgent by default', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: null })

    const { executeRequest } = await import('../http.service')
    await executeRequest(baseRequest)

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    expect(config.httpsAgent).toBeUndefined()
  })
})

describe('executeRequest – request body', () => {
  it('parses JSON body for POST', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 201, statusText: 'Created', headers: {}, data: {} })

    const req: ApiRequest = {
      ...baseRequest,
      method: 'POST',
      body: '{"key":"value"}',
    }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    expect(config.data).toEqual({ key: 'value' })
    expect((config.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('sends plain text body when JSON parse fails', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} })

    const req: ApiRequest = {
      ...baseRequest,
      method: 'POST',
      body: 'plain text body',
    }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    expect(config.data).toBe('plain text body')
  })

  it('ignores body for GET requests', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} })

    const req: ApiRequest = { ...baseRequest, method: 'GET', body: '{"should":"be ignored"}' }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    expect(config.data).toBeUndefined()
  })

  it('ignores body for DELETE requests', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} })

    const req: ApiRequest = { ...baseRequest, method: 'DELETE', body: '{"data":"ignored"}' }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    const config = mockedAxios.mock.calls[0][0] as Record<string, unknown>
    expect(config.data).toBeUndefined()
  })
})

describe('executeRequest – OAuth token injection', () => {
  it('injects Bearer token when credentials resolve', async () => {
    mockedGetCredentials.mockResolvedValueOnce({
      clientId: 'id',
      clientSecret: 'sec',
      tokenUrl: 'http://t',
    })
    mockedGetToken.mockResolvedValueOnce('my-access-token')
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} })

    const { executeRequest } = await import('../http.service')
    await executeRequest(baseRequest)

    const config = mockedAxios.mock.calls[0][0] as Record<string, Record<string, string>>
    expect(config.headers['Authorization']).toBe('Bearer my-access-token')
  })

  it('skips token injection silently when no default credentials exist', async () => {
    mockedGetCredentials.mockRejectedValueOnce(new Error('not found'))
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} })

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.statusCode).toBe(200)
    const config = mockedAxios.mock.calls[0][0] as Record<string, Record<string, string>>
    expect(config.headers['Authorization']).toBeUndefined()
  })

  it('throws when a named secret fails to resolve', async () => {
    mockedGetCredentials.mockRejectedValueOnce(new Error('access denied'))

    const req: ApiRequest = { ...baseRequest, credentialsSecretName: 'prod/api-creds' }

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(req)

    expect(result.statusCode).toBe(0)
    expect(result.error).toContain('Failed to retrieve credentials secret')
    expect(result.error).toContain('prod/api-creds')
  })

  it('does not overwrite existing Authorization header', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} })

    const req: ApiRequest = {
      ...baseRequest,
      headers: [{ key: 'Authorization', value: 'Bearer existing-token', enabled: true }],
    }

    const { executeRequest } = await import('../http.service')
    await executeRequest(req)

    expect(mockedGetCredentials).not.toHaveBeenCalled()
    const config = mockedAxios.mock.calls[0][0] as Record<string, Record<string, string>>
    expect(config.headers['Authorization']).toBe('Bearer existing-token')
  })
})

describe('executeRequest – error handling', () => {
  it('returns error response when axios throws', async () => {
    mockedAxios.mockRejectedValueOnce(new Error('network error'))

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.statusCode).toBe(0)
    expect(result.statusText).toBe('Request Failed')
    expect(result.error).toBe('network error')
    expect(result.body).toBeNull()
  })

  it('handles non-Error thrown values', async () => {
    mockedAxios.mockRejectedValueOnce('string error')

    const { executeRequest } = await import('../http.service')
    const result = await executeRequest(baseRequest)

    expect(result.error).toBe('Unknown error occurred')
  })
})
