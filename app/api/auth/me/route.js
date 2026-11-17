import { json, currentUser, publicUser } from '@/lib/auth';
import { many } from '@/lib/db';
import { unreadCount } from '@/lib/notify';

export async function GET() {
  const user = await currentUser();
  if (!user) return json({ ok: false, user: null }, 401);

  const unread = await unreadCount(user.user_id);
  const notifications = await many(
    `SELECT notification_id, title, message, status, sent_at, notification_type
     FROM notifications
     WHERE receiver_id = $1
     ORDER BY sent_at DESC
     LIMIT 20`,
    [user.user_id]
  );
  const latest = notifications.filter((n) => n.status === 'Unread').slice(0, 5);

  return json({
    ok: true,
    user: publicUser(user),
    unread,
    notifications,
    latest,
  });
}
