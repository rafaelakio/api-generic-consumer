import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { execSync } from 'child_process';
import type { ApiRequest, ApiResponse } from '@/types';
import { getApiCredentials } from './secrets.service';
import { getClientCredentialsToken } from './oauth.service';

// Read Windows system proxy from registry once at startup.
// env vars (HTTPS_PROXY / HTTP_PROXY) always take precedence.
const systemProxy: { url: string | null; noProxy: string | null } = (() => {
  if (process.platform !== 'win32') return { url: null, noProxy: null };
  try {
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
    const out = execSync(`reg query "${key}"`, { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
    const enabled = parseInt((out.match(/ProxyEnable\s+REG_DWORD\s+(0x\w+)/)?.[1] ?? '0'), 16) === 1;
    const server  = out.match(/ProxyServer\s+REG_SZ\s+(\S+)/)?.[1]?.trim();
    const override = out.match(/ProxyOverride\s+REG_SZ\s+(.+)/)?.[1]?.trim();
    if (enabled && server) {
      return {
        url: server.startsWith('http') ? server : `http://${server}`,
        noProxy: override ? override.replace(/;/g, ',').replace(/<local>/gi, 'localhost,127.0.0.1') : null,
      };
    }
  } catch { /* proxy not configured or registry inaccessible */ }
  return { url: null, noProxy: null };
})();

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

    // ── Outgoing HTTP proxy ───────────────────────────────────────────────────
    // Priority: HTTPS_PROXY / HTTP_PROXY env var → Windows system proxy → none
    // Override: NO_PROXY env var → Windows ProxyOverride → none
    let proxyConfig: AxiosRequestConfig['proxy'] | false = false;
    const proxyUrl  = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? systemProxy.url;
    const noProxyStr = process.env.NO_PROXY ?? systemProxy.noProxy ?? undefined;
    if (proxyUrl && !isNoProxy(req.url, noProxyStr)) {
      const p = new URL(proxyUrl);
      proxyConfig = {
        host: p.hostname,
        port: Number(p.port) || (p.protocol === 'https:' ? 443 : 80),
        protocol: p.protocol,
        ...(p.username ? { auth: { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) } } : {}),
      };
    }

    // ── Execute ──────────────────────────────────────────────────────────────
    const config: AxiosRequestConfig = {
      url: req.url,
      method: req.method,
      headers,
      data,
      httpsAgent,
      proxy: proxyConfig,
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

// Returns true when the target URL matches a NO_PROXY entry.
// Supports exact hostnames, wildcard prefixes (.corp.com) and CIDR is ignored.
function isNoProxy(targetUrl: string, noProxy?: string): boolean {
  if (!noProxy) return false;
  let hostname: string;
  try {
    hostname = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return noProxy.split(',').map(s => s.trim().toLowerCase()).some(entry => {
    if (!entry) return false;
    if (entry === '*') return true;
    if (entry.startsWith('.')) return hostname === entry.slice(1) || hostname.endsWith(entry);
    return hostname === entry;
  });
}
