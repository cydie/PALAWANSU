import { json, requireStaff } from '@/lib/auth';
import { query, many } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const count = async (sql) => {
    const result = await query(sql);
    return Number(result.rows[0].n);
  };

  const [students, deficiencies, pending, approved, rejected, completed, unread, recent] = await Promise.all([
    count("SELECT COUNT(*)::int AS n FROM users WHERE role IN ('Freshman','Transferee','Graduating')"),
    count('SELECT COUNT(*)::int AS n FROM student_deficiencies'),
    count("SELECT COUNT(*)::int AS n FROM uploaded_documents WHERE review_status IN ('Pending','Under Review')"),
    count("SELECT COUNT(*)::int AS n FROM uploaded_documents WHERE review_status = 'Approved'"),
    count("SELECT COUNT(*)::int AS n FROM uploaded_documents WHERE review_status = 'Rejected'"),
    count("SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE status IN ('Approved','Completed')"),
    count("SELECT COUNT(*)::int AS n FROM notifications WHERE status = 'Unread'"),
    many(
      `SELECT sd.student_deficiency_id, sd.status, sd.assigned_date, u.first_name, u.last_name, u.role, dt.deficiency_name
       FROM student_deficiencies sd
       JOIN users u ON u.user_id = sd.user_id
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       ORDER BY sd.student_deficiency_id DESC LIMIT 8`
    ),
  ]);

  const stats = { students, deficiencies, pending, approved, rejected, completed, unread };

  return json({ ok: true, stats, recent });
}
