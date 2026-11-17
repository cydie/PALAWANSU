import { one, query } from '@/lib/db';
import { sendCampusEmail } from '@/lib/mail';
import { getSmtpSettings, smtpIsReady } from '@/lib/settings';

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

  if (channel === 'Email') {
    const receiver = await one(
      'SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1 LIMIT 1',
      [receiverId]
    );
    if (!receiver?.email) {
      await logAction(receiverId, `Email notification skipped (no email on account): ${title}`);
      return { emailed: false, reason: 'missing_email' };
    }
    const settings = await getSmtpSettings();
    if (!smtpIsReady(settings)) {
      await logAction(receiverId, `Email notification queued in-app only (SMTP not ready): ${title}`);
      return { emailed: false, reason: 'smtp_not_ready' };
    }
    try {
      await sendCampusEmail({
        to: receiver.email,
        title,
        message,
        recipientName: [receiver.first_name, receiver.last_name].filter(Boolean).join(' '),
      });
      await logAction(receiverId, `Email notification sent: ${title}`);
      return { emailed: true };
    } catch (err) {
      await logAction(receiverId, `Email notification failed (${err.message}): ${title}`);
      return { emailed: false, reason: 'send_failed', error: err.message };
    }
  }

  if (channel === 'SMS') {
    await logAction(receiverId, `SMS notification queued (not configured): ${title}`);
  }

  return { emailed: false };
}

/** In-app notice, plus email when SMTP is ready (no duplicate inbox row). */
export async function notifyStudent(senderId, receiverId, title, message) {
  await sendNotification(senderId, receiverId, title, message, 'System');
  const settings = await getSmtpSettings();
  if (!smtpIsReady(settings)) return { emailed: false, reason: 'smtp_not_ready' };

  const receiver = await one(
    'SELECT email, first_name, last_name FROM users WHERE user_id = $1 LIMIT 1',
    [receiverId]
  );
  if (!receiver?.email) return { emailed: false, reason: 'missing_email' };

  try {
    await sendCampusEmail({
      to: receiver.email,
      title,
      message,
      recipientName: [receiver.first_name, receiver.last_name].filter(Boolean).join(' '),
    });
    await logAction(receiverId, `Email copy sent: ${title}`);
    return { emailed: true };
  } catch (err) {
    await logAction(receiverId, `Email copy failed (${err.message}): ${title}`);
    return { emailed: false, reason: 'send_failed', error: err.message };
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
