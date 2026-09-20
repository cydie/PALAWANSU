import bcrypt from 'bcryptjs';
import { json, publicUser, requireStudent } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { logAction } from '@/lib/notify';
import { saveProfile } from '@/lib/upload';

export async function GET() {
  const { user, error } = await requireStudent();
  if (error) return error;
  return json({ ok: true, user: publicUser(user) });
}

export async function POST(request) {
  const { user, error } = await requireStudent();
  if (error) return error;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const result = await saveProfile(form.get('profile_image'), user.user_id);
    if (!result.ok) return json(result, 422);
    await query('UPDATE users SET profile_image=$1 WHERE user_id=$2', [result.path, user.user_id]);
    await logAction(user.user_id, 'Updated profile image');
    return json({ ok: true, message: 'Profile photo updated.' });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === 'password') {
    const current = String(body.current_password || '');
    const next = String(body.new_password || '');
    const confirm = String(body.confirm_password || '');
    const fresh = await one('SELECT password FROM users WHERE user_id=$1', [user.user_id]);
    if (!(await bcrypt.compare(current, fresh.password))) {
      return json({ ok: false, error: 'Current password is incorrect.' }, 422);
    }
    if (next.length < 8) return json({ ok: false, error: 'New password must be at least 8 characters.' }, 422);
    if (next !== confirm) return json({ ok: false, error: 'New passwords do not match.' }, 422);
    await query('UPDATE users SET password=$1 WHERE user_id=$2', [await bcrypt.hash(next, 12), user.user_id]);
    await logAction(user.user_id, 'Changed password');
    return json({ ok: true, message: 'Password changed.' });
  }

  const first = String(body.first_name || '').trim();
  const last = String(body.last_name || '').trim();
  const middle = String(body.middle_name || '').trim();
  const email = String(body.email || '').trim();
  if (!first || !last || !email.includes('@')) {
    return json({ ok: false, error: 'Please provide valid name and email.' }, 422);
  }
  await query('UPDATE users SET first_name=$1, last_name=$2, middle_name=$3, email=$4 WHERE user_id=$5', [
    first,
    last,
    middle || null,
    email,
    user.user_id,
  ]);
  await logAction(user.user_id, 'Updated profile');
  return json({ ok: true, message: 'Profile updated.' });
}
