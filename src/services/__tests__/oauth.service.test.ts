import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import type { ApiCredentialsSecret } from '@/types'

vi.mock('axios')

const mockedAxiosPost = vi.mocked(axios.post)

const credentials: ApiCredentialsSecret = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  tokenUrl: 'https://auth.example.com/token',
}

const credentialsWithScope: ApiCredentialsSecret = {
  ...credentials,
  scope: 'api.read',
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getClientCredentialsToken – cache miss', () => {
  it('fetches token when cache is empty', async () => {
    mockedAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'tok-abc', expires_in: 3600 },
    })

    const { getClientCredentialsToken } = await import('../oauth.service')
    const token = await getClientCredentialsToken(credentials, 'key-miss-1')

    expect(token).toBe('tok-abc')
    expect(mockedAxiosPost).toHaveBeenCalledOnce()
  })

  it('sends correct form params', async () => {
    mockedAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'tok-params', expires_in: 3600 },
    })

    const { getClientCredentialsToken } = await import('../oauth.service')
    await getClientCredentialsToken(credentials, 'key-params')

    const callArgs = mockedAxiosPost.mock.calls[0]
    expect(callArgs[0]).toBe('https://auth.example.com/token')
    const body = callArgs[1] as URLSearchParams
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_id')).toBe('client-id')
    expect(body.get('client_secret')).toBe('client-secret')
    expect(body.get('scope')).toBeNull()
  })

  it('includes scope when provided', async () => {
    mockedAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'tok-scope', expires_in: 3600 },
    })

    const { getClientCredentialsToken } = await import('../oauth.service')
    await getClientCredentialsToken(credentialsWithScope, 'key-scope')

    const body = mockedAxiosPost.mock.calls[0][1] as URLSearchParams
    expect(body.get('scope')).toBe('api.read')
  })
})

describe('getClientCredentialsToken – cache hit', () => {
  it('returns cached token without a new request', async () => {
    mockedAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'tok-cached', expires_in: 3600 },
    })

    const { getClientCredentialsToken } = await import('../oauth.service')
    await getClientCredentialsToken(credentials, 'key-cache-hit')
    const token = await getClientCredentialsToken(credentials, 'key-cache-hit')

    expect(token).toBe('tok-cached')
    expect(mockedAxiosPost).toHaveBeenCalledOnce()
  })
})

describe('getClientCredentialsToken – expiry', () => {
  it('refreshes token when within 60s of expiry', async () => {
    vi.useFakeTimers()
    const now = Date.now()

    mockedAxiosPost
      .mockResolvedValueOnce({ data: { access_token: 'tok-old', expires_in: 120 } })
      .mockResolvedValueOnce({ data: { access_token: 'tok-new', expires_in: 3600 } })

    const { getClientCredentialsToken } = await import('../oauth.service')
    await getClientCredentialsToken(credentials, 'key-expiry')

    // Advance time so token is within 60s of expiry (120s - 70s = 50s left → needs refresh)
    vi.setSystemTime(now + 70_000)
    const token = await getClientCredentialsToken(credentials, 'key-expiry')

    expect(token).toBe('tok-new')
    expect(mockedAxiosPost).toHaveBeenCalledTimes(2)
  })
})
