import axios from 'axios';
import type { ApiCredentialsSecret } from '@/types';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

// In-memory cache per secret name (valid for one process lifetime)
const tokenCache = new Map<string, TokenCache>();

export async function getClientCredentialsToken(
  credentials: ApiCredentialsSecret,
  cacheKey: string,
): Promise<string> {
  const cached = tokenCache.get(cacheKey);
  // Refresh 60 s before expiry
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.accessToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    ...(credentials.scope ? { scope: credentials.scope } : {}),
  });

  const response = await axios.post<{
    access_token: string;
    expires_in: number;
  }>(credentials.tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token, expires_in } = response.data;

  tokenCache.set(cacheKey, {
    accessToken: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  });

  return access_token;
}
