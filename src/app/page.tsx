import { redirect } from 'next/navigation';

// Root always redirects to the dashboard
export default function Home() {
  redirect('/dashboard');
}
