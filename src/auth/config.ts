import type { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import os from 'os';
import { getAzureAdSecret } from '@/services/secrets.service';
import azureConfig from '../../config/azuread.config.json';

async function buildAuthOptions(): Promise<NextAuthOptions> {
  let azureProvider = null;

  try {
    const { clientId, clientSecret, tenantId } = await getAzureAdSecret();
    azureProvider = AzureADProvider({
      clientId,
      clientSecret,
      tenantId,
      authorization: {
        params: {
          scope: azureConfig.scopes.join(' '),
          response_type: azureConfig.responseType,
          response_mode: azureConfig.responseMode,
        },
      },
    });
  } catch {
    // Azure AD secret not available (e.g. LocalStack not seeded yet) — skip provider
  }

  return {
    providers: [
      // ── Windows / local credentials ──────────────────────────────────────────
      // Reads the OS user running the Next.js process.
      // In a domain environment this will be DOMAIN\username.
      // No password is required — auth is delegated to the OS session.
      CredentialsProvider({
        id: 'windows',
        name: 'Windows',
        credentials: {},
        async authorize() {
          const info = os.userInfo();
          const username = info.username;
          const hostname = os.hostname();

          return {
            id: username,
            name: username,
            email: `${username}@${hostname}`,
          };
        },
      }),

      // ── Admin local (username + password) ────────────────────────────────────
      CredentialsProvider({
        id: 'admin',
        name: 'Admin',
        credentials: {
          username: { label: 'Usuário', type: 'text' },
          password: { label: 'Senha', type: 'password' },
        },
        async authorize(credentials) {
          const user = process.env.ADMIN_USERNAME ?? 'admin';
          const pass = process.env.ADMIN_PASSWORD ?? 'admin';

          if (credentials?.username === user && credentials?.password === pass) {
            return { id: 'admin', name: 'Admin', email: 'admin@local' };
          }
          return null;
        },
      }),

      // ── Azure AD (only when secret is available) ──────────────────────────────
      ...(azureProvider ? [azureProvider] : []),
    ],

    callbacks: {
      async jwt({ token, account, user }) {
        if (account?.access_token) token.accessToken = account.access_token;
        if (user) {
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
        }
        return token;
      },
      async session({ session, token }) {
        if (token.accessToken) {
          (session as unknown as Record<string, unknown>).accessToken =
            token.accessToken;
        }
        return session;
      },
    },

    pages: {
      signIn: '/login',
      error: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
  };
}

// Cache is intentionally skipped in dev so hot-reload never serves stale options.
let optionsPromise: Promise<NextAuthOptions> | null = null;

export function getAuthOptions(): Promise<NextAuthOptions> {
  if (!optionsPromise || process.env.NODE_ENV === 'development') {
    optionsPromise = buildAuthOptions();
  }
  return optionsPromise;
}
