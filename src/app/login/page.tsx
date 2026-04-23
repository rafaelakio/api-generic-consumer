'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [adminError, setAdminError] = useState('');
  const error = searchParams.get('error');

  useEffect(() => {
    if (status === 'authenticated') router.replace(callbackUrl);
  }, [status, router, callbackUrl]);

  async function handleSignIn(provider: string) {
    setLoadingProvider(provider);
    await signIn(provider, { callbackUrl });
    setLoadingProvider(null);
  }

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAdminError('');
    setLoadingProvider('admin');
    const result = await signIn('admin', {
      username: adminUsername,
      password: adminPassword,
      callbackUrl,
      redirect: false,
    });
    setLoadingProvider(null);
    if (result?.error) {
      setAdminError('Usuário ou senha inválidos.');
    } else if (result?.url) {
      router.replace(result.url);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">API Consumer</h1>
          <p className="mt-2 text-gray-500">Escolha como deseja entrar</p>
        </div>

        {error && (
          <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Falha ao autenticar. Tente novamente.
          </div>
        )}

        {/* Windows Authentication */}
        <button
          onClick={() => handleSignIn('windows')}
          disabled={!!loadingProvider}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60"
        >
          {loadingProvider === 'windows' ? (
            <Spinner />
          ) : (
            <WindowsIcon />
          )}
          Entrar com Windows
        </button>

        <div className="flex items-center gap-3 w-full">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Azure AD */}
        <button
          onClick={() => handleSignIn('azure-ad')}
          disabled={!!loadingProvider}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {loadingProvider === 'azure-ad' ? (
            <Spinner />
          ) : (
            <MicrosoftIcon />
          )}
          Entrar com Azure AD
        </button>

        <div className="flex items-center gap-3 w-full">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Admin credentials */}
        <form onSubmit={handleAdminSignIn} className="w-full flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acesso Admin</p>
          <input
            type="text"
            placeholder="Usuário"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            disabled={!!loadingProvider}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
          />
          <input
            type="password"
            placeholder="Senha"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            disabled={!!loadingProvider}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
          />
          {adminError && (
            <p className="text-sm text-red-600">{adminError}</p>
          )}
          <button
            type="submit"
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {loadingProvider === 'admin' ? <Spinner /> : null}
            Entrar como Admin
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center">
          "Entrar com Windows" usa o usuário da sessão atual da máquina.
          Nenhuma senha é solicitada ou armazenada.
        </p>
      </div>
    </div>
  );
}

function WindowsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg" fill="white">
      <path d="M0 12.402l35.687-4.86.016 34.423-35.67.201zm35.67 33.529l.022 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.739z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
