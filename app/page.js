import { redirect } from 'next/navigation';
import { homePath } from '@/lib/auth';
import { readSession } from '@/lib/session';

export default async function HomePage() {
  const session = await readSession();
  if (!session?.role) redirect('/login');
  redirect(homePath(session.role));
}
