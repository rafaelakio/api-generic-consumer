import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures this is available inside the vi.mock() factory (which is hoisted)
const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  // Regular function (not arrow) so it works with `new`
  SecretsManagerClient: vi.fn(function(this: unknown) { return { send: mockSend } }),
  GetSecretValueCommand: vi.fn(function(this: Record<string, unknown>, input: unknown) { this.input = input }),
}))

import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

// Import once – the singleton `client` is created on first use
import { getApiCredentials, getAzureAdSecret } from '../secrets.service'

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.LOCALSTACK_ENDPOINT
  delete process.env.AWS_SECRET_NAME_AZURE
  delete process.env.AWS_SECRET_NAME_API_CREDENTIALS
})

describe('getApiCredentials', () => {
  it('returns parsed credentials from Secrets Manager', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'id', clientSecret: 'sec', tokenUrl: 'http://t' }),
    })

    const result = await getApiCredentials('my-secret')

    expect(result.clientId).toBe('id')
    expect(result.tokenUrl).toBe('http://t')
  })

  it('calls GetSecretValueCommand with the given secret name', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'x', clientSecret: 'y', tokenUrl: 'http://z' }),
    })

    await getApiCredentials('my-secret')

    expect(vi.mocked(GetSecretValueCommand)).toHaveBeenCalledWith({ SecretId: 'my-secret' })
  })

  it('uses default secret name when none provided', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'x', clientSecret: 'y', tokenUrl: 'http://z' }),
    })

    await getApiCredentials()

    expect(vi.mocked(GetSecretValueCommand)).toHaveBeenCalledWith({
      SecretId: 'api-consumer/api-credentials',
    })
  })

  it('uses env var for secret name when no arg provided', async () => {
    process.env.AWS_SECRET_NAME_API_CREDENTIALS = 'custom/secret'
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'a', clientSecret: 'b', tokenUrl: 'http://c' }),
    })

    await getApiCredentials()

    expect(vi.mocked(GetSecretValueCommand)).toHaveBeenCalledWith({ SecretId: 'custom/secret' })
  })

  it('throws when SecretString is missing', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: undefined })

    await expect(getApiCredentials('empty-secret')).rejects.toThrow('has no string value')
  })
})

describe('getAzureAdSecret', () => {
  it('returns parsed Azure AD secret', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'az', clientSecret: 'az-sec', tenantId: 'tenant' }),
    })

    const result = await getAzureAdSecret()

    expect(result.tenantId).toBe('tenant')
  })

  it('uses env var for Azure secret name', async () => {
    process.env.AWS_SECRET_NAME_AZURE = 'azure/custom'
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'c', clientSecret: 'd', tenantId: 'e' }),
    })

    await getAzureAdSecret()

    expect(vi.mocked(GetSecretValueCommand)).toHaveBeenCalledWith({ SecretId: 'azure/custom' })
  })

  it('uses default Azure secret name when env var not set', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ clientId: 'c', clientSecret: 'd', tenantId: 'e' }),
    })

    await getAzureAdSecret()

    expect(vi.mocked(GetSecretValueCommand)).toHaveBeenCalledWith({ SecretId: 'api-consumer/azure-ad' })
  })
})
