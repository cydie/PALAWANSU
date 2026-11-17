import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { currentUser, homePath, isStaff, publicUser } from '@/lib/auth';

export default async function AdminLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!isStaff(user.role)) redirect(homePath(user.role));
  return (
    <AppShell area="admin" initialUser={publicUser(user)}>
      {children}
    </AppShell>
  );
}
