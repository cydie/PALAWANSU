import bcrypt from 'bcryptjs';
import {
  currentSchoolYear,
  currentSemester,
  normalizeSchoolYear,
  normalizeSemester,
} from '@/lib/academic';
import { json, requireStaff, STUDENT_ROLES } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { logAction, notifyStudent } from '@/lib/notify';

const ALL_ROLES = ['Admin', 'Registrar', 'Freshman', 'Transferee', 'Graduating'];
const STAFF_MANAGE_ROLES = ['Admin', 'Registrar'];

function allowedRolesFor(actor) {
  if (actor.role === 'Admin') return ALL_ROLES;
  return [...STUDENT_ROLES];
}

export async function GET(request) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const roleFilter = new URL(request.url).searchParams.get('role') || 'All';
  const statusFilter = new URL(request.url).searchParams.get('status') || 'All';
  const allowed = allowedRolesFor(user);
  const params = [];
  let sql =
    'SELECT user_id, student_number, first_name, last_name, middle_name, email, username, role, school_year, semester, status, created_at FROM users WHERE 1=1';

  if (user.role !== 'Admin') {
    params.push(STUDENT_ROLES);
    sql += ` AND role = ANY($${params.length}::text[])`;
  }

  if (allowed.includes(roleFilter)) {
    params.push(roleFilter);
    sql += ` AND role = $${params.length}`;
  }

  if (['Active', 'Inactive', 'Pending'].includes(statusFilter)) {
    params.push(statusFilter);
    sql += ` AND status = $${params.length}`;
  }

  sql += ` ORDER BY CASE status WHEN 'Pending' THEN 0 WHEN 'Active' THEN 1 ELSE 2 END, created_at DESC`;
  return json({
    ok: true,
    users: await many(sql, params),
    scope: user.role === 'Admin' ? 'all' : 'students',
    allowedRoles: allowed,
  });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const action = body.action || 'create';
  const allowed = allowedRolesFor(user);

  if (action === 'set_status' || action === 'approve' || action === 'toggle') {
    const id = Number(body.user_id || 0);
    if (id === Number(user.user_id)) {
      return json({ ok: false, error: 'You cannot change your own account status.' }, 422);
    }
    const target = await one('SELECT * FROM users WHERE user_id=$1', [id]);
    if (!target) return json({ ok: false, error: 'User not found.' }, 404);
    if (!allowed.includes(target.role)) {
      return json({ ok: false, error: 'You can only manage student accounts.' }, 403);
    }

    let nextStatus = String(body.status || '').trim();
    if (action === 'approve') nextStatus = 'Active';
    if (action === 'toggle') {
      nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    }
    if (!['Active', 'Inactive', 'Pending'].includes(nextStatus)) {
      return json({ ok: false, error: 'Choose Active, Inactive, or Pending.' }, 422);
    }
    if (nextStatus === target.status) {
      return json({ ok: true, message: `Status is already ${nextStatus}.` });
    }

    await query('UPDATE users SET status=$1 WHERE user_id=$2', [nextStatus, id]);
    await logAction(user.user_id, `Changed status of user #${id} (${target.username}) to ${nextStatus}`);

    if (STUDENT_ROLES.includes(target.role) && nextStatus === 'Active' && target.status !== 'Active') {
      await notifyStudent(
        user.user_id,
        id,
        'Account activated',
        'Your PSU Rizal student account is now Active. You may sign in and complete your deficiency requirements.'
      );
    } else if (STUDENT_ROLES.includes(target.role) && nextStatus === 'Inactive') {
      await notifyStudent(
        user.user_id,
        id,
        'Account deactivated',
        'Your PSU Rizal student account was set to Inactive. Contact the registrar if you need access restored.'
      );
    }

    return json({ ok: true, message: `Status updated to ${nextStatus}.` });
  }

  const first = String(body.first_name || '').trim();
  const last = String(body.last_name || '').trim();
  const middle = String(body.middle_name || '').trim();
  const email = String(body.email || '').trim();
  const username = String(body.username || '').trim();
  const studentNumber = String(body.student_number || '').trim();
  let role = allowed.includes(body.role) ? body.role : (user.role === 'Admin' ? 'Freshman' : 'Freshman');
  if (!allowed.includes(role)) role = 'Freshman';
  if (user.role !== 'Admin' && STAFF_MANAGE_ROLES.includes(role)) {
    return json({ ok: false, error: 'Registrar can only manage student accounts.' }, 403);
  }
  const status = ['Active', 'Inactive', 'Pending'].includes(body.status) ? body.status : 'Active';
  const password = String(body.password || '');
  const id = Number(body.user_id || 0);
  const isStudentRole = STUDENT_ROLES.includes(role);
  const schoolYear = isStudentRole
    ? (normalizeSchoolYear(body.school_year) || currentSchoolYear())
    : null;
  const semester = isStudentRole
    ? (normalizeSemester(body.semester) || currentSemester())
    : null;

  if (!first || !last || !email.includes('@') || !username) {
    return json({ ok: false, error: 'Please fill required fields with a valid email.' }, 422);
  }
  if (isStudentRole && !studentNumber) {
    return json({ ok: false, error: 'Student number is required for student accounts.' }, 422);
  }

  if (action === 'create') {
    if (password.length < 8) return json({ ok: false, error: 'Password must be at least 8 characters.' }, 422);
    const exists = await one(
      'SELECT user_id FROM users WHERE email=$1 OR username=$2 OR ($3::text IS NOT NULL AND student_number=$3) LIMIT 1',
      [email, username, studentNumber || null]
    );
    if (exists) return json({ ok: false, error: 'Email, username, or student number already exists.' }, 409);
    await query(
      `INSERT INTO users (student_number, first_name, last_name, middle_name, email, username, password, role, status, school_year, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
        schoolYear,
        semester,
      ]
    );
    await logAction(user.user_id, `Created user ${username}`);
    return json({ ok: true, message: 'User created.' });
  }

  const target = await one('SELECT * FROM users WHERE user_id=$1', [id]);
  if (!target) return json({ ok: false, error: 'User not found.' }, 404);
  if (!allowed.includes(target.role) || !allowed.includes(role)) {
    return json({ ok: false, error: 'You can only manage student accounts.' }, 403);
  }

  const params = [
    studentNumber || null,
    first,
    last,
    middle || null,
    email,
    username,
    role,
    status,
    schoolYear,
    semester,
  ];
  let sql =
    'UPDATE users SET student_number=$1, first_name=$2, last_name=$3, middle_name=$4, email=$5, username=$6, role=$7, status=$8, school_year=$9, semester=$10';
  if (password) {
    params.push(await bcrypt.hash(password, 12));
    sql += `, password=$${params.length}`;
  }
  params.push(id);
  sql += ` WHERE user_id=$${params.length}`;
  await query(sql, params);
  await logAction(user.user_id, `Updated user #${id}`);
  return json({ ok: true, message: 'User updated.' });
}
