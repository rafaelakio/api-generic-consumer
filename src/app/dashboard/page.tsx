import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/auth/config';
import { redirect } from 'next/navigation';
import ApiTester from '@/components/features/ApiTester';
import Navbar from '@/components/features/Navbar';
import SessionBannerWrapper from '@/components/features/SessionBannerWrapper';

export default async function DashboardPage() {
  const options = await getAuthOptions();
  const session = await getServerSession(options);

  if (!session) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.user?.name ?? '', email: session.user?.email ?? '' }} />
      <SessionBannerWrapper />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <ApiTester />
      </main>
    </div>
  );
}
