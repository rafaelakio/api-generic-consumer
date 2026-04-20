'use client';

import { useChangeSession } from '@/context/ChangeSessionContext';
import { Button } from '@/components/ui/Button';

export default function SessionSummary() {
  const { session, callLogs, summaryVisible, dismissSummary } = useChangeSession();

  if (!summaryVisible || !session) return null;

  const closedAt = new Date();
  const durationMs = closedAt.getTime() - session.openedAt.getTime();
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationLabel = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <CheckIcon />
            <div>
              <h2 className="text-white font-bold text-lg">Sessão Encerrada</h2>
              <p className="text-gray-400 text-sm mt-0.5">Resumo de auditoria da mudança</p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <MetaRow label="Número da Mudança" value={session.changeNumber} mono />
          <MetaRow label="Duração da Sessão" value={durationLabel} />
          <MetaRow label="Abertura da Sessão" value={session.openedAt.toLocaleString('pt-BR')} />
          <MetaRow label="Janela da Mudança" value={`${session.startTime.toLocaleString('pt-BR')} → ${session.endTime.toLocaleString('pt-BR')}`} />
          <MetaRow label="Total de Chamadas" value={String(callLogs.length)} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {callLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma chamada foi realizada nesta sessão.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b-2 border-gray-200">
                  <th className="pb-2 pr-3 font-semibold text-gray-600 w-8">#</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600">Timestamp</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600 w-20">Método</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600">URL</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600 w-28">Status</th>
                  <th className="pb-2 font-semibold text-gray-600 w-24 text-right">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.map((log) => (
                  <tr key={log.seq} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-400 font-mono text-xs">{log.seq}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`font-mono text-xs font-bold ${methodColor(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-700 break-all max-w-xs">
                      {log.url}
                    </td>
                    <td className="py-2 pr-3">
                      {log.error ? (
                        <span className="text-xs text-red-600 font-medium">ERRO</span>
                      ) : (
                        <span className={`text-xs font-semibold ${statusColor(log.statusCode)}`}>
                          {log.statusCode} {log.statusText}
                        </span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-500 text-right">
                      {log.responseTimeMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
          <Button onClick={dismissSummary}>Nova Sessão</Button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className={`text-gray-800 font-semibold ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function methodColor(method: string) {
  const map: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-yellow-600',
    PATCH: 'text-orange-600',
    DELETE: 'text-red-600',
  };
  return map[method] ?? 'text-gray-600';
}

function statusColor(code: number) {
  if (code === 0) return 'text-gray-500';
  if (code < 300) return 'text-green-700';
  if (code < 400) return 'text-yellow-700';
  return 'text-red-700';
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}
