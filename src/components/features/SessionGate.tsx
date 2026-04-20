'use client';

import { useState } from 'react';
import { useChangeSession } from '@/context/ChangeSessionContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SessionGate() {
  const { openSession } = useChangeSession();
  const [changeNumber, setChangeNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Informe datas e horários válidos.');
      return;
    }
    if (end <= start) {
      setError('O horário de fim deve ser posterior ao de início.');
      return;
    }
    if (end <= now) {
      setError('O horário de fim já passou. Verifique a janela da mudança.');
      return;
    }
    if (!changeNumber.trim()) {
      setError('Informe o número da mudança.');
      return;
    }

    openSession({ changeNumber: changeNumber.trim().toUpperCase(), startTime: start, endTime: end });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <LockIcon />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                Identificação de Mudança
              </h2>
              <p className="text-amber-100 text-sm mt-0.5">
                Informe os dados da mudança produtiva para iniciar a sessão
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <Input
            label="Número da Mudança"
            value={changeNumber}
            onChange={(e) => setChangeNumber(e.target.value)}
            placeholder="CHG0001234"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Data/Hora de Início
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Data/Hora de Fim
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full mt-1">
            Abrir Sessão
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Todas as chamadas serão auditadas com o código da mudança
          </p>
        </form>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}
