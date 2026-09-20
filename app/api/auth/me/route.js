import { json, currentUser, publicUser } from '@/lib/auth';
import { unreadCount } from '@/lib/notify';

export async function GET() {
  const user = await currentUser();
  if (!user) return json({ ok: false, user: null }, 401);
  return json({
    ok: true,
    user: publicUser(user),
    unread: await unreadCount(user.user_id),
  });
}
