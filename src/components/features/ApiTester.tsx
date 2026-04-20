'use client';

import { useState } from 'react';
import RequestForm from './RequestForm';
import ResponseViewer from './ResponseViewer';
import type { ApiRequest, ApiResponse } from '@/types';

export default function ApiTester() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(req: ApiRequest) {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: req }),
      });

      const json = await res.json();

      if (!res.ok) {
        setResponse({
          statusCode: res.status,
          statusText: res.statusText,
          headers: {},
          body: json,
          responseTimeMs: 0,
          error: json?.error ?? 'Proxy error',
        });
        return;
      }

      setResponse(json.data as ApiResponse);
    } catch (err) {
      setResponse({
        statusCode: 0,
        statusText: 'Network Error',
        headers: {},
        body: null,
        responseTimeMs: 0,
        error: err instanceof Error ? err.message : 'Unknown network error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left: request */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-900">Request</h2>
        <RequestForm onSubmit={handleRequest} loading={loading} />
      </section>

      {/* Right: response */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-900">Response</h2>
        <ResponseViewer response={response} />
      </section>
    </div>
  );
}
