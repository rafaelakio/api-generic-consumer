'use client';

import { useState } from 'react';
import type { ApiResponse } from '@/types';
import { formatBytes } from '@/lib/utils';
import { maskPiiBody, countPiiMatches } from '@/lib/pii-mask';

interface ResponseViewerProps {
  response: ApiResponse | null;
}

function statusColor(code: number) {
  if (code === 0) return 'bg-gray-100 text-gray-600';
  if (code < 300) return 'bg-green-100 text-green-700';
  if (code < 400) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export default function ResponseViewer({ response }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [maskPii, setMaskPii] = useState(true);

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg">Nenhuma resposta</p>
        <p className="text-sm mt-1">Envie uma requisição para ver o resultado aqui</p>
      </div>
    );
  }

  const rawBodyStr =
    typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body, null, 2);

  const displayBodyStr = maskPii ? maskPiiBody(rawBodyStr) : rawBodyStr;
  const piiCount = countPiiMatches(rawBodyStr);
  const bodySizeBytes = new TextEncoder().encode(rawBodyStr).length;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Status bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {response.error ? (
          <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
            Erro
          </span>
        ) : (
          <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${statusColor(response.statusCode)}`}>
            {response.statusCode} {response.statusText}
          </span>
        )}
        <span className="text-sm text-gray-500">{response.responseTimeMs} ms</span>
        <span className="text-sm text-gray-500">{formatBytes(bodySizeBytes)}</span>

        {/* PII toggle */}
        <div className="ml-auto flex items-center gap-2">
          {piiCount > 0 && maskPii && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <ShieldIcon />
              {piiCount} campo{piiCount !== 1 ? 's' : ''} mascarado{piiCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMaskPii((v) => !v)}
            title={maskPii ? 'Desativar mascaramento de PII' : 'Ativar mascaramento de PII'}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 border transition-colors ${
              maskPii
                ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600'
                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <ShieldIcon />
            {maskPii ? 'PII: ON' : 'PII: OFF'}
          </button>
        </div>
      </div>

      {response.error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {response.error}
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {(['body', 'headers'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-white border-b-2 border-brand-600 text-brand-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'body' && (
            <>
              {maskPii && piiCount > 0 && (
                <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Dados sensíveis mascarados com rotação de caracteres{' '}
                  <code className="font-mono">* # @ %</code>. Clique em{' '}
                  <strong>PII: ON</strong> para revelar.
                </p>
              )}
              <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-800 max-h-[500px] overflow-auto">
                {displayBodyStr || '(vazio)'}
              </pre>
            </>
          )}

          {activeTab === 'headers' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {k}
                    </td>
                    <td className="py-1.5 font-mono text-xs text-gray-800 break-all">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z" />
    </svg>
  );
}
