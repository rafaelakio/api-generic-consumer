import type { CallLog, ChangeSession } from '@/types';

export function buildReport(session: ChangeSession, callLogs: CallLog[], closedAt: Date): string {
  const SEP  = '='.repeat(80);
  const LINE = '-'.repeat(80);

  const plannedMs   = session.endTime.getTime() - session.startTime.getTime();
  const effectiveMs = closedAt.getTime() - session.openedAt.getTime();

  const lines: string[] = [
    SEP,
    `RELATÓRIO DE MUDANÇA`,
    SEP,
    '',
    `DADOS DA SESSÃO`,
    LINE,
    row('Número da mudança', session.changeNumber),
    row('Janela (início)',   session.startTime.toLocaleString('pt-BR')),
    row('Janela (fim)',      session.endTime.toLocaleString('pt-BR')),
    row('Duração prevista',  `${formatDuration(plannedMs)} (${plannedMs.toLocaleString('pt-BR')} ms)`),
    row('Duração efetiva',   `${formatDuration(effectiveMs)} (${effectiveMs.toLocaleString('pt-BR')} ms)`),
    row('Sessão aberta por', session.openedBy),
    row('Aberta em',         session.openedAt.toLocaleString('pt-BR')),
    row('Encerrada em',      closedAt.toLocaleString('pt-BR')),
    '',
  ];

  lines.push(`URLS CONSUMIDAS`);
  lines.push(LINE);

  if (callLogs.length === 0) {
    lines.push('Nenhuma chamada realizada nesta sessão.');
  } else {
    const W = { seq: 4, ts: 23, method: 8, status: 20, time: 10 };
    const urlWidth = 80 - W.seq - W.ts - W.method - W.status - W.time - 5;

    const head =
      pad('#',         W.seq)    + '  ' +
      pad('Timestamp', W.ts)     + '  ' +
      pad('Método',    W.method) + '  ' +
      pad('URL',       urlWidth) + '  ' +
      pad('Status',    W.status) + '  ' +
      'Tempo (ms)';

    lines.push(head);
    lines.push('-'.repeat(head.length));

    for (const log of callLogs) {
      const status = log.error
        ? `ERRO: ${log.error}`.slice(0, W.status)
        : `${log.statusCode} ${log.statusText}`.slice(0, W.status);

      lines.push(
        pad(String(log.seq),                       W.seq)    + '  ' +
        pad(log.timestamp.toLocaleString('pt-BR'), W.ts)     + '  ' +
        pad(log.method,                            W.method) + '  ' +
        pad(log.url,                               urlWidth) + '  ' +
        pad(status,                                W.status) + '  ' +
        String(log.responseTimeMs),
      );
    }
  }

  lines.push('');
  lines.push(SEP);
  lines.push(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`);
  lines.push(SEP);

  return lines.join('\n');
}

function row(label: string, value: string): string {
  return `${label.padEnd(20)}: ${value}`;
}

function pad(str: string, width: number): string {
  if (str.length > width) return str.slice(0, width - 1) + '…';
  return str.padEnd(width);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours   > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}
