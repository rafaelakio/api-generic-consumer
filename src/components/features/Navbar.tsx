'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  user: { name: string; email: string };
}

export default function Navbar({ user }: NavbarProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-brand-700">API Consumer</span>
          <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
            beta
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-none">{user.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            loading={signingOut}
            onClick={handleSignOut}
          >
            {!signingOut && 'Sair'}
          </Button>
        </div>
      </div>
    </header>
  );
}
