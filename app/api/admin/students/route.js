import { json, requireStaff } from '@/lib/auth';
import { many, query } from '@/lib/db';
import { logAction } from '@/lib/notify';

export async function GET(request) {
  const { error } = await requireStaff();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'All';
  const q = (searchParams.get('q') || '').trim();

  const params = [];
  let sql = `SELECT user_id, student_number, first_name, last_name, middle_name, email, role, status, created_at
             FROM users WHERE role IN ('Freshman','Transferee','Graduating')`;
  if (['Freshman', 'Transferee', 'Graduating'].includes(category)) {
    params.push(category);
    sql += ` AND role = $${params.length}`;
  }
  if (q) {
    params.push(`%${q}%`);
    const n = params.length;
    sql += ` AND (first_name ILIKE $${n} OR last_name ILIKE $${n} OR student_number ILIKE $${n} OR email ILIKE $${n})`;
  }
  sql += ' ORDER BY last_name, first_name';
  return json({ ok: true, students: await many(sql, params) });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const id = Number(body.user_id || 0);
  const first = String(body.first_name || '').trim();
  const last = String(body.last_name || '').trim();
  const middle = String(body.middle_name || '').trim();
  const email = String(body.email || '').trim();
  const studentNumber = String(body.student_number || '').trim();
  const role = String(body.role || '');
  const status = String(body.status || 'Active');
  if (!['Freshman', 'Transferee', 'Graduating'].includes(role)) {
    return json({ ok: false, error: 'Invalid student category.' }, 422);
  }
  if (!first || !last || !email.includes('@')) {
    return json({ ok: false, error: 'Invalid student details.' }, 422);
  }
  await query(
    `UPDATE users SET first_name=$1, last_name=$2, middle_name=$3, email=$4, student_number=$5, role=$6, status=$7
     WHERE user_id=$8 AND role IN ('Freshman','Transferee','Graduating')`,
    [first, last, middle || null, email, studentNumber || null, role, status, id]
  );
  await logAction(user.user_id, `Updated student #${id}`);
  return json({ ok: true });
}
