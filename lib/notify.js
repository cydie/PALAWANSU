import { query } from '@/lib/db';

export async function logAction(userId, action) {
  await query('INSERT INTO system_logs (user_id, action) VALUES ($1, $2)', [userId, action]);
}

export async function unreadCount(userId) {
  const result = await query(
    "SELECT COUNT(*)::int AS n FROM notifications WHERE receiver_id = $1 AND status = 'Unread'",
    [userId]
  );
  return result.rows[0]?.n || 0;
}

export async function sendNotification(senderId, receiverId, title, message, type = 'System') {
  const allowed = ['SMS', 'Email', 'System'];
  const channel = allowed.includes(type) ? type : 'System';
  await query(
    `INSERT INTO notifications (sender_id, receiver_id, notification_type, title, message, status)
     VALUES ($1, $2, $3, $4, $5, 'Unread')`,
    [senderId, receiverId, channel, title, message]
  );
  if (channel === 'Email' || channel === 'SMS') {
    await logAction(receiverId, `${channel} notification queued: ${title}`);
  }
}

export async function notifyStaff(title, message, senderId = null) {
  const result = await query(
    "SELECT user_id FROM users WHERE role IN ('Admin','Registrar') AND status = 'Active'"
  );
  for (const row of result.rows) {
    await sendNotification(senderId, row.user_id, title, message, 'System');
  }
}
