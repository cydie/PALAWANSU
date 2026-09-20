import { json, requireStudent } from '@/lib/auth';
import { many, query } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireStudent();
  if (error) return error;
  const rows = await many(
    `SELECT n.*, u.first_name, u.last_name FROM notifications n
     LEFT JOIN users u ON u.user_id = n.sender_id
     WHERE n.receiver_id=$1 ORDER BY n.sent_at DESC`,
    [user.user_id]
  );
  return json({ ok: true, rows });
}

export async function POST(request) {
  const { user, error } = await requireStudent();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  if (body.action === 'mark_all') {
    await query("UPDATE notifications SET status='Read' WHERE receiver_id=$1 AND status='Unread'", [user.user_id]);
    return json({ ok: true, message: 'All notifications marked as read.' });
  }
  await query("UPDATE notifications SET status='Read' WHERE notification_id=$1 AND receiver_id=$2", [
    Number(body.notification_id || 0),
    user.user_id,
  ]);
  return json({ ok: true });
}
