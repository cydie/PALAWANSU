import { NextResponse } from 'next/server';
import { one } from '@/lib/db';
import { readSession } from '@/lib/session';
import { friendlyDbError } from '@/lib/errors';

export const STAFF_ROLES = ['Admin', 'Registrar'];
export const STUDENT_ROLES = ['Freshman', 'Transferee', 'Graduating'];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function isStudent(role) {
  return STUDENT_ROLES.includes(role);
}

export function fullName(user) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ');
}

export function publicUser(user) {
  if (!user) return null;
  return {
    user_id: Number(user.user_id),
    student_number: user.student_number,
    first_name: user.first_name,
    last_name: user.last_name,
    middle_name: user.middle_name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    profile_image: user.profile_image,
    name: fullName(user),
  };
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(err) {
  console.error(err);
  return json({ ok: false, error: friendlyDbError(err) }, 500);
}

export async function currentUser() {
  const session = await readSession();
  if (!session?.user_id) return null;
  const user = await one('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [session.user_id]);
  if (!user || user.status !== 'Active') return null;
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    return { user: null, error: json({ ok: false, error: 'Unauthorized' }, 401) };
  }
  return { user, error: null };
}

export async function requireStaff() {
  const result = await requireUser();
  if (result.error) return result;
  if (!isStaff(result.user.role)) {
    return { user: null, error: json({ ok: false, error: 'Forbidden' }, 403) };
  }
  return result;
}

export async function requireStudent() {
  const result = await requireUser();
  if (result.error) return result;
  if (!isStudent(result.user.role)) {
    return { user: null, error: json({ ok: false, error: 'Forbidden' }, 403) };
  }
  return result;
}

export function homePath(role) {
  return isStaff(role) ? '/admin/dashboard' : '/student/dashboard';
}
