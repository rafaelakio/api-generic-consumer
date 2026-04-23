'use client';

import { useState } from 'react';
import { useChangeSession } from '@/context/ChangeSessionContext';
import { Button } from '@/components/ui/Button';
import { buildReport } from '@/lib/report';

export default function SessionSummary() {
  const { session, callLogs, summaryVisible, dismissSummary } = useChangeSession();
  const [copied, setCopied] = useState(false);

  if (!summaryVisible || !session) return null;

  const closedAt = session.closedAt ?? new Date();
  const report = buildReport(session, callLogs, closedAt);

  async function handleCopy() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 top-14 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckIcon />
            <div>
              <h2 className="text-white font-bold text-lg">Relatório da Mudança {session.changeNumber}</h2>
              <p className="text-gray-400 text-sm mt-0.5">Sessão encerrada · Pronto para envio à auditoria</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {copied ? <CheckSmallIcon /> : <CopyIcon />}
            {copied ? 'Copiado!' : 'Copiar relatório'}
          </button>
        </div>

        {/* Report text */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <pre className="text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed">
            {report}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Gerado em {new Date().toLocaleString('pt-BR')}
          </p>
          <Button onClick={dismissSummary}>Nova Sessão</Button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}
