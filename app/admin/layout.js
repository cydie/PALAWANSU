import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { currentUser, homePath, isStaff, publicUser } from '@/lib/auth';
import { unreadCount } from '@/lib/notify';

export default async function AdminLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!isStaff(user.role)) redirect(homePath(user.role));
  const unread = await unreadCount(user.user_id);
  return (
    <AppShell area="admin" initialUser={publicUser(user)} initialUnread={unread}>
      {children}
    </AppShell>
  );
}
