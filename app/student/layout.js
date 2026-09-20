import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { currentUser, homePath, isStudent, publicUser } from '@/lib/auth';
import { unreadCount } from '@/lib/notify';

export default async function StudentLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!isStudent(user.role)) redirect(homePath(user.role));
  const unread = await unreadCount(user.user_id);
  return (
    <AppShell area="student" initialUser={publicUser(user)} initialUnread={unread}>
      {children}
    </AppShell>
  );
}
