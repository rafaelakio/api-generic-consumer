import NextAuth from 'next-auth';
import { getAuthOptions } from '@/auth/config';

async function handler(req: Request, ctx: { params: Record<string, string> }) {
  const options = await getAuthOptions();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (NextAuth(options) as any)(req, ctx);
}

export { handler as GET, handler as POST };
