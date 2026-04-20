'use client';

import { SessionProvider } from 'next-auth/react';
import { ChangeSessionProvider } from '@/context/ChangeSessionContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChangeSessionProvider>{children}</ChangeSessionProvider>
    </SessionProvider>
  );
}
