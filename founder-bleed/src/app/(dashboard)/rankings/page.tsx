import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { RankingsClient } from './rankings-client';

export const metadata: Metadata = {
  title: 'Rankings | Founder Bleed',
  description: 'See how you compare to other founders',
};

export default async function RankingsPage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return <RankingsClient isAuthenticated={isAuthenticated} />;
}
