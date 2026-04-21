import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import type { ApiRequest, ApiResponse } from '@/types';
import { getApiCredentials } from './secrets.service';
import { getClientCredentialsToken } from './oauth.service';

export async function executeRequest(req: ApiRequest): Promise<ApiResponse> {
  const start = Date.now();

  try {
    // ── HTTPS agent (SSL bypass or custom CA) ────────────────────────────────
    let httpsAgent: https.Agent | undefined;

    if (req.bypassSsl) {
      httpsAgent = new https.Agent({ rejectUnauthorized: false });
    } else if (req.certificate) {
      httpsAgent = new https.Agent({ ca: req.certificate });
    }

    // ── Headers from user input ──────────────────────────────────────────────
    const headers: Record<string, string> = {};
    for (const h of req.headers) {
      if (h.enabled && h.key.trim()) {
        headers[h.key.trim()] = h.value;
      }
    }

    // ── OAuth2 client-credentials token (optional) ───────────────────────────
    // Only attaches Authorization if:
    //   a) the user explicitly named a secret in the Auth tab, OR
    //   b) the default secret resolves successfully from Secrets Manager.
    // For public APIs with no secret configured this block is skipped silently.
    if (!headers['Authorization']) {
      try {
        const credentials = await getApiCredentials(req.credentialsSecretName);
        const cacheKey = req.credentialsSecretName ?? '__default__';
        const token = await getClientCredentialsToken(credentials, cacheKey);
        headers['Authorization'] = `Bearer ${token}`;
      } catch (credErr) {
        // Only hard-fail when the caller explicitly requested a named secret
        if (req.credentialsSecretName) {
          const msg =
            credErr instanceof Error ? credErr.message : String(credErr);
          throw new Error(`Failed to retrieve credentials secret "${req.credentialsSecretName}": ${msg}`);
        }
        // Otherwise silently proceed without Authorization header
      }
    }

    // ── Body ─────────────────────────────────────────────────────────────────
    let data: unknown;
    let contentType = headers['Content-Type'];

    if (req.method !== 'GET' && req.method !== 'DELETE') {
      switch (req.contentType) {
        case 'form-data':
          const FormData = (await import('form-data')).default;
          const form = new FormData();
          
          // Adicionar campos text
          if (req.formData) {
            Object.entries(req.formData).forEach(([key, value]) => {
              form.append(key, value);
            });
          }
          
          // Adicionar arquivos
          if (req.files) {
            req.files.forEach(file => {
              const buffer = Buffer.from(file.content, 'base64');
              form.append(file.fieldName || 'file', buffer, {
                filename: file.name,
                contentType: file.type,
              });
            });
          }
          
          data = form;
          contentType = `multipart/form-data; boundary=${form.getBoundary()}`;
          break;
          
        case 'x-www-form-urlencoded':
          data = new URLSearchParams(req.formData || {}).toString();
          contentType = 'application/x-www-form-urlencoded';
          break;
          
        case 'json':
        default:
          try {
            data = JSON.parse(req.body);
            contentType = 'application/json';
          } catch {
            data = req.body;
            contentType = 'text/plain';
          }
      }
    }

    if (contentType && !headers['Content-Type']) {
      headers['Content-Type'] = contentType;
    }

    // ── Execute ──────────────────────────────────────────────────────────────
    const config: AxiosRequestConfig = {
      url: req.url,
      method: req.method,
      headers,
      data,
      httpsAgent,
      validateStatus: () => true, // surface 4xx/5xx as real responses, not throws
      timeout: 30_000,
    };

    const response = await axios(config);

    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') responseHeaders[key] = value;
      else if (Array.isArray(value)) responseHeaders[key] = value.join(', ');
    }

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: response.data,
      responseTimeMs: Date.now() - start,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      statusCode: 0,
      statusText: 'Request Failed',
      headers: {},
      body: null,
      responseTimeMs: Date.now() - start,
      error: message,
    };
  }
}
