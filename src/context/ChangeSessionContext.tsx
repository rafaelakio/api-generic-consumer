'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ApiResponse, CallLog, ChangeSession } from '@/types';
import { buildReport } from '@/lib/report';

interface OpenSessionInput {
  changeNumber: string;
  startTime: Date;
  endTime: Date;
  openedBy: string;
}

interface ChangeSessionContextValue {
  session: ChangeSession | null;
  callLogs: CallLog[];
  summaryVisible: boolean;
  openSession: (data: OpenSessionInput) => void;
  logCall: (method: string, url: string, response: ApiResponse) => void;
  closeSession: () => void;
  dismissSummary: () => void;
}

const ChangeSessionContext = createContext<ChangeSessionContextValue | null>(null);

async function serverLog(payload: {
  changeNumber: string;
  level: 'SESSION_OPEN' | 'CALL' | 'SESSION_CLOSE' | 'SESSION_SUMMARY' | 'FULL_REPORT';
  message: string;
  timestamp: string;
  table?: Record<string, unknown>[];
}) {
  try {
    await fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // silently ignore — browser console still has the log
  }
}

export function ChangeSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ChangeSession | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [summaryVisible, setSummaryVisible] = useState(false);

  const sessionRef = useRef<ChangeSession | null>(null);
  const callLogsRef = useRef<CallLog[]>([]);
  const seqRef = useRef(0);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { callLogsRef.current = callLogs; }, [callLogs]);

  const closeSession = useCallback(() => {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

    const s = sessionRef.current;
    const logs = callLogsRef.current;
    const now = new Date();

    if (s) {
      const durationMs = now.getTime() - s.openedAt.getTime();
      const closeMsg =
        `ENCERRAMENTO DE SESSÃO | Total de chamadas: ${logs.length} | ` +
        `Sessão permaneceu aberta por: ${formatDuration(durationMs)}`;

      console.log(`[${s.changeNumber}] [${now.toISOString()}] ${closeMsg}`);

      const table = logs.map((l) => ({
        '#': l.seq,
        'Timestamp': l.timestamp.toLocaleString('pt-BR'),
        'Método': l.method,
        'URL': l.url,
        'Status': l.error ? `ERRO: ${l.error}` : `${l.statusCode} ${l.statusText}`,
        'Tempo (ms)': l.responseTimeMs,
      }));

      if (logs.length > 0) console.table(table);

      serverLog({
        changeNumber: s.changeNumber,
        level: 'SESSION_CLOSE',
        message: closeMsg,
        timestamp: now.toISOString(),
      });

      serverLog({
        changeNumber: s.changeNumber,
        level: 'SESSION_SUMMARY',
        message: `URLs consumidas (${logs.length})`,
        timestamp: now.toISOString(),
        table: logs.length > 0 ? table : undefined,
      });

      const updatedSession = { ...s, closedAt: now };
      setSession(updatedSession);

      const report = buildReport(updatedSession, logs, now);
      serverLog({
        changeNumber: s.changeNumber,
        level: 'FULL_REPORT',
        message: report,
        timestamp: now.toISOString(),
      });
    }

    setSummaryVisible(true);
  }, []);

  function openSession(data: OpenSessionInput) {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

    const now = new Date();
    seqRef.current = 0;

    const newSession: ChangeSession = { ...data, openedAt: now, openedBy: data.openedBy };
    setSession(newSession);
    setCallLogs([]);
    setSummaryVisible(false);

    const msUntilEnd = data.endTime.getTime() - now.getTime();
    const totalMs = data.endTime.getTime() - data.startTime.getTime();

    const openMsg =
      `INÍCIO DE SESSÃO | ` +
      `Janela: ${data.startTime.toLocaleString('pt-BR')} → ${data.endTime.toLocaleString('pt-BR')} | ` +
      `Duração total da janela: ${formatDuration(totalMs)} | ` +
      `Sessão aberta por: ${formatDuration(msUntilEnd)}`;

    console.log(`[${data.changeNumber}] [${now.toISOString()}] ${openMsg}`);

    serverLog({
      changeNumber: data.changeNumber,
      level: 'SESSION_OPEN',
      message: openMsg,
      timestamp: now.toISOString(),
    });

    if (msUntilEnd > 0) {
      expireTimerRef.current = setTimeout(closeSession, msUntilEnd);
    } else {
      closeSession();
    }
  }

  function logCall(method: string, url: string, response: ApiResponse) {
    const s = sessionRef.current;
    if (!s) return;

    seqRef.current += 1;
    const seq = seqRef.current;
    const timestamp = new Date();

    const log: CallLog = {
      seq,
      timestamp,
      method,
      url,
      statusCode: response.statusCode,
      statusText: response.statusText,
      responseTimeMs: response.responseTimeMs,
      error: response.error,
    };

    setCallLogs((prev) => [...prev, log]);

    const status = response.error
      ? `ERRO: ${response.error}`
      : `${response.statusCode} ${response.statusText}`;

    const callMsg = `#${seq} ${method} ${url} → ${status} (${response.responseTimeMs}ms)`;

    console.log(`[${s.changeNumber}] [${timestamp.toISOString()}] ${callMsg}`);

    serverLog({
      changeNumber: s.changeNumber,
      level: 'CALL',
      message: callMsg,
      timestamp: timestamp.toISOString(),
    });
  }

  function dismissSummary() {
    setSummaryVisible(false);
    setSession(null);
    setCallLogs([]);
    seqRef.current = 0;
  }

  return (
    <ChangeSessionContext.Provider
      value={{ session, callLogs, summaryVisible, openSession, logCall, closeSession, dismissSummary }}
    >
      {children}
    </ChangeSessionContext.Provider>
  );
}

export function useChangeSession() {
  const ctx = useContext(ChangeSessionContext);
  if (!ctx) throw new Error('useChangeSession must be used inside ChangeSessionProvider');
  return ctx;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}min`;
}
