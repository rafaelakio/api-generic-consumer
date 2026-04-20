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

interface OpenSessionInput {
  changeNumber: string;
  startTime: Date;
  endTime: Date;
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
      console.log(
        `[${s.changeNumber}] [${now.toISOString()}] ENCERRAMENTO DE SESSÃO | ` +
        `Total de chamadas: ${logs.length}`,
      );
      if (logs.length > 0) {
        console.table(
          logs.map((l) => ({
            '#': l.seq,
            'Timestamp': l.timestamp.toLocaleString('pt-BR'),
            'Método': l.method,
            'URL': l.url,
            'Status': l.error ? `ERRO: ${l.error}` : `${l.statusCode} ${l.statusText}`,
            'Tempo (ms)': l.responseTimeMs,
          })),
        );
      }
    }

    setSummaryVisible(true);
  }, []);

  function openSession(data: OpenSessionInput) {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

    const now = new Date();
    seqRef.current = 0;

    const newSession: ChangeSession = { ...data, openedAt: now };
    setSession(newSession);
    setCallLogs([]);
    setSummaryVisible(false);

    const msUntilEnd = data.endTime.getTime() - now.getTime();
    const totalMs = data.endTime.getTime() - data.startTime.getTime();

    console.log(
      `[${data.changeNumber}] [${now.toISOString()}] INÍCIO DE SESSÃO | ` +
      `Janela: ${data.startTime.toLocaleString('pt-BR')} → ${data.endTime.toLocaleString('pt-BR')} | ` +
      `Duração total da janela: ${formatDuration(totalMs)} | ` +
      `Encerramento automático em: ${formatDuration(msUntilEnd)}`,
    );

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

    console.log(
      `[${s.changeNumber}] [${timestamp.toISOString()}] #${seq} ${method} ${url} → ${status} (${response.responseTimeMs}ms)`,
    );
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
