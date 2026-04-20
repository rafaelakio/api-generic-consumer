'use client';

import { useEffect, useState } from 'react';
import { useChangeSession } from '@/context/ChangeSessionContext';
import { Button } from '@/components/ui/Button';

export default function SessionBanner() {
  const { session, callLogs, closeSession } = useChangeSession();
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!session) return;

    function tick() {
      if (!session) return;
      const ms = session.endTime.getTime() - Date.now();
      if (ms <= 0) {
        setRemaining('Expirando…');
        return;
      }
      const totalMinutes = Math.floor(ms / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const seconds = Math.floor((ms % 60000) / 1000);
      if (hours > 0) {
        setRemaining(`${hours}h ${String(minutes).padStart(2, '0')}min ${String(seconds).padStart(2, '0')}s`);
      } else {
        setRemaining(`${String(minutes).padStart(2, '0')}min ${String(seconds).padStart(2, '0')}s`);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  const isExpiringSoon = session.endTime.getTime() - Date.now() < 5 * 60 * 1000;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 text-sm border-b flex-wrap ${
        isExpiringSoon
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
        isExpiringSoon ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
      }`}>
        {session.changeNumber}
      </span>

      <span className="text-xs">
        {session.startTime.toLocaleString('pt-BR')} até {session.endTime.toLocaleString('pt-BR')}
      </span>

      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        isExpiringSoon ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
      }`}>
        {isExpiringSoon ? 'Expirando: ' : 'Restante: '}{remaining}
      </span>

      <span className="text-xs text-gray-500">
        {callLogs.length} chamada{callLogs.length !== 1 ? 's' : ''} realizada{callLogs.length !== 1 ? 's' : ''}
      </span>

      <div className="ml-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={closeSession}
          className="text-red-600 hover:bg-red-100 text-xs"
        >
          Encerrar Sessão
        </Button>
      </div>
    </div>
  );
}
