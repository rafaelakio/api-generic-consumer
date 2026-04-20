// ─── Change Session ───────────────────────────────────────────────────────────

export interface ChangeSession {
  changeNumber: string;
  startTime: Date;
  endTime: Date;
  openedAt: Date;
  closedAt?: Date;
  openedBy: string;
}

export interface CallLog {
  seq: number;
  timestamp: Date;
  method: string;
  url: string;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  error?: string;
}

// ─── HTTP Request / Response ──────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  url: string;
  method: HttpMethod;
  headers: RequestHeader[];
  body: string;
  bypassSsl: boolean;
  /** PEM-encoded certificate string (only when bypassSsl is false and cert is provided) */
  certificate?: string;
  /** Name of the Secrets Manager secret holding the target API credentials (optional) */
  credentialsSecretName?: string;
}

export interface ApiResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTimeMs: number;
  error?: string;
}

// ─── Secrets Manager ──────────────────────────────────────────────────────────

export interface AzureAdSecret {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface ApiCredentialsSecret {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  accessToken?: string;
}

// ─── Proxy API ────────────────────────────────────────────────────────────────

export interface ProxyRequestBody {
  request: ApiRequest;
}

export interface ProxyResponseBody {
  data: ApiResponse;
}
