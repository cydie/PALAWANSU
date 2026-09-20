import { json, requireStaff } from '@/lib/auth';
import { many, query } from '@/lib/db';
import { logAction, sendNotification } from '@/lib/notify';

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;
  const students = await many(
    `SELECT user_id, first_name, last_name, role FROM users
     WHERE role IN ('Freshman','Transferee','Graduating') AND status='Active' ORDER BY last_name`
  );
  const inbox = await many(
    `SELECT n.*, u.first_name, u.last_name FROM notifications n
     LEFT JOIN users u ON u.user_id = n.sender_id
     WHERE n.receiver_id = $1 ORDER BY n.sent_at DESC LIMIT 40`,
    [user.user_id]
  );
  const outbox = await many(
    `SELECT n.*, u.first_name, u.last_name FROM notifications n
     JOIN users u ON u.user_id = n.receiver_id
     WHERE n.sender_id = $1 ORDER BY n.sent_at DESC LIMIT 40`,
    [user.user_id]
  );
  return json({ ok: true, students, inbox, outbox });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  if (body.action === 'mark_read') {
    await query("UPDATE notifications SET status='Read' WHERE notification_id=$1 AND receiver_id=$2", [
      Number(body.notification_id || 0),
      user.user_id,
    ]);
    return json({ ok: true });
  }

  const title = String(body.title || '').trim();
  const message = String(body.message || '').trim();
  let type = String(body.notification_type || 'System');
  const receiver = String(body.receiver || '');
  const specificId = Number(body.user_id || 0);
  if (!title || !message) return json({ ok: false, error: 'Title and message are required.' }, 422);
  if (!['SMS', 'Email', 'System'].includes(type)) type = 'System';

  let targets = [];
  if (receiver === 'all_students') {
    targets = (await many("SELECT user_id FROM users WHERE role IN ('Freshman','Transferee','Graduating') AND status='Active'")).map(
      (r) => r.user_id
    );
  } else if (['Freshman', 'Transferee', 'Graduating'].includes(receiver)) {
    targets = (await many("SELECT user_id FROM users WHERE role=$1 AND status='Active'", [receiver])).map((r) => r.user_id);
  } else if (receiver === 'specific' && specificId > 0) {
    targets = [specificId];
  }
  if (!targets.length) return json({ ok: false, error: 'No recipients found.' }, 422);

  for (const rid of targets) {
    await sendNotification(user.user_id, rid, title, message, type);
  }
  await logAction(user.user_id, `Sent ${targets.length} ${type} notification(s): ${title}`);
  return json({ ok: true, message: `Notification sent to ${targets.length} recipient(s).` });
}
