import bcrypt from 'bcryptjs';
import { one } from '@/lib/db';
import { json, STUDENT_ROLES, publicUser } from '@/lib/auth';
import { logAction } from '@/lib/notify';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const data = {
    student_number: String(body.student_number || '').trim(),
    first_name: String(body.first_name || '').trim(),
    last_name: String(body.last_name || '').trim(),
    middle_name: String(body.middle_name || '').trim(),
    email: String(body.email || '').trim(),
    username: String(body.username || '').trim(),
    role: String(body.role || ''),
    password: String(body.password || ''),
    password_confirm: String(body.password_confirm || ''),
  };

  if (!data.student_number || !data.first_name || !data.last_name) {
    return json({ ok: false, error: 'Student Number and name are required.' }, 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return json({ ok: false, error: 'Valid email is required.' }, 422);
  }
  if (data.username.length < 3) {
    return json({ ok: false, error: 'Username must be at least 3 characters.' }, 422);
  }
  if (!STUDENT_ROLES.includes(data.role)) {
    return json({ ok: false, error: 'Select a valid student category.' }, 422);
  }
  if (data.password.length < 8) {
    return json({ ok: false, error: 'Password must be at least 8 characters.' }, 422);
  }
  if (data.password !== data.password_confirm) {
    return json({ ok: false, error: 'Passwords do not match.' }, 422);
  }

  const exists = await one(
    'SELECT user_id FROM users WHERE email = $1 OR username = $2 OR student_number = $3 LIMIT 1',
    [data.email, data.username, data.student_number]
  );
  if (exists) {
    return json({ ok: false, error: 'Email, username, or student number already exists.' }, 409);
  }

  const hash = await bcrypt.hash(data.password, 12);
  const inserted = await one(
    `INSERT INTO users (student_number, first_name, last_name, middle_name, email, username, password, role, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Active') RETURNING *`,
    [
      data.student_number,
      data.first_name,
      data.last_name,
      data.middle_name || null,
      data.email,
      data.username,
      hash,
      data.role,
    ]
  );
  await logAction(inserted.user_id, `Registered as ${data.role}`);
  return json({ ok: true, user: publicUser(inserted) });
}
