import { json, requireStaff } from '@/lib/auth';
import { many } from '@/lib/db';

export async function GET(request) {
  const { error } = await requireStaff();
  if (error) return error;
  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  let sql = `SELECT sl.*, u.username, u.first_name, u.last_name, u.role
             FROM system_logs sl
             LEFT JOIN users u ON u.user_id = sl.user_id`;
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    sql += ' WHERE sl.action ILIKE $1 OR u.username ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1';
  }
  sql += ' ORDER BY sl.log_time DESC LIMIT 200';
  return json({ ok: true, logs: await many(sql, params) });
}
