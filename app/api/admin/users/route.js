import bcrypt from 'bcryptjs';
import { json, requireStaff } from '@/lib/auth';
import { many, query } from '@/lib/db';
import { logAction } from '@/lib/notify';

const ROLES = ['Admin', 'Registrar', 'Freshman', 'Transferee', 'Graduating'];

export async function GET(request) {
  const { error } = await requireStaff();
  if (error) return error;
  const role = new URL(request.url).searchParams.get('role') || 'All';
  const params = [];
  let sql = 'SELECT user_id, student_number, first_name, last_name, middle_name, email, username, role, status, created_at FROM users';
  if (ROLES.includes(role)) {
    params.push(role);
    sql += ' WHERE role = $1';
  }
  sql += ' ORDER BY created_at DESC';
  return json({ ok: true, users: await many(sql, params) });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const action = body.action || 'create';

  if (action === 'toggle') {
    const id = Number(body.user_id || 0);
    if (id === Number(user.user_id)) {
      return json({ ok: false, error: 'You cannot deactivate your own account.' }, 422);
    }
    await query(
      "UPDATE users SET status = CASE WHEN status = 'Active' THEN 'Inactive' ELSE 'Active' END WHERE user_id=$1",
      [id]
    );
    await logAction(user.user_id, `Toggled status for user #${id}`);
    return json({ ok: true });
  }

  const first = String(body.first_name || '').trim();
  const last = String(body.last_name || '').trim();
  const middle = String(body.middle_name || '').trim();
  const email = String(body.email || '').trim();
  const username = String(body.username || '').trim();
  const studentNumber = String(body.student_number || '').trim();
  const role = ROLES.includes(body.role) ? body.role : 'Freshman';
  const status = ['Active', 'Inactive'].includes(body.status) ? body.status : 'Active';
  const password = String(body.password || '');
  const id = Number(body.user_id || 0);

  if (!first || !last || !email.includes('@') || !username) {
    return json({ ok: false, error: 'Please fill required fields with a valid email.' }, 422);
  }

  if (action === 'create') {
    if (password.length < 8) return json({ ok: false, error: 'Password must be at least 8 characters.' }, 422);
    await query(
      `INSERT INTO users (student_number, first_name, last_name, middle_name, email, username, password, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        studentNumber || null,
        first,
        last,
        middle || null,
        email,
        username,
        await bcrypt.hash(password, 12),
        role,
        status,
      ]
    );
    await logAction(user.user_id, `Created user ${username}`);
    return json({ ok: true });
  }

  const params = [studentNumber || null, first, last, middle || null, email, username, role, status];
  let sql = 'UPDATE users SET student_number=$1, first_name=$2, last_name=$3, middle_name=$4, email=$5, username=$6, role=$7, status=$8';
  if (password) {
    params.push(await bcrypt.hash(password, 12));
    sql += `, password=$${params.length}`;
  }
  params.push(id);
  sql += ` WHERE user_id=$${params.length}`;
  await query(sql, params);
  await logAction(user.user_id, `Updated user #${id}`);
  return json({ ok: true });
}
