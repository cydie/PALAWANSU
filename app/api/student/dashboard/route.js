import { json, requireStudent } from '@/lib/auth';
import { many, query } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireStudent();
  if (error) return error;
  const uid = user.user_id;
  const count = async (sql, params) => Number((await query(sql, params)).rows[0].n);

  const [pending, review, done, total, defs, notifs] = await Promise.all([
    count(
      "SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE user_id=$1 AND status IN ('Pending','Rejected')",
      [uid]
    ),
    count("SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE user_id=$1 AND status='Under Review'", [uid]),
    count(
      "SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE user_id=$1 AND status IN ('Approved','Completed')",
      [uid]
    ),
    count('SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE user_id=$1', [uid]),
    many(
      `SELECT sd.*, dt.deficiency_name, dt.required_document
       FROM student_deficiencies sd
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       WHERE sd.user_id=$1 ORDER BY sd.assigned_date DESC LIMIT 6`,
      [uid]
    ),
    many('SELECT * FROM notifications WHERE receiver_id=$1 ORDER BY sent_at DESC LIMIT 5', [uid]),
  ]);

  const stats = { pending, review, done, total };
  return json({ ok: true, stats, defs, notifs });
}
