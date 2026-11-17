import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { currentUser, homePath, isStudent, publicUser } from '@/lib/auth';

export default async function StudentLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!isStudent(user.role)) redirect(homePath(user.role));
  return (
    <AppShell area="student" initialUser={publicUser(user)}>
      {children}
    </AppShell>
  );
}
