import { json, requireStudent } from '@/lib/auth';
import { many } from '@/lib/db';

export async function GET(request) {
  const { user, error } = await requireStudent();
  if (error) return error;
  const status = new URL(request.url).searchParams.get('status') || 'All';
  const params = [user.user_id];
  let sql = `SELECT sd.*, dt.deficiency_name, dt.description, dt.required_document
             FROM student_deficiencies sd
             JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
             WHERE sd.user_id = $1`;
  if (status !== 'All') {
    params.push(status);
    sql += ' AND sd.status = $2';
  }
  sql += ` ORDER BY CASE sd.status
            WHEN 'Pending' THEN 1 WHEN 'Rejected' THEN 2 WHEN 'Under Review' THEN 3
            WHEN 'Approved' THEN 4 WHEN 'Completed' THEN 5 ELSE 6 END, sd.assigned_date DESC`;
  return json({ ok: true, rows: await many(sql, params) });
}
