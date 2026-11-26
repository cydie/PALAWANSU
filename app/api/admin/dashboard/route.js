import { json, requireStaff } from '@/lib/auth';
import { query, many } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const count = async (sql) => {
    const result = await query(sql);
    return Number(result.rows[0].n);
  };

  const countP = async (sql, params = []) => {
    const result = await query(sql, params);
    return Number(result.rows[0].n);
  };

  const [
    students,
    pending,
    approved,
    rejected,
    completed,
    openDefs,
    unread,
    unclearedStudents,
    recent,
  ] = await Promise.all([
    count("SELECT COUNT(*)::int AS n FROM users WHERE role IN ('Freshman','Transferee','Graduating')"),
    count("SELECT COUNT(*)::int AS n FROM uploaded_documents WHERE review_status IN ('Pending','Under Review')"),
    count("SELECT COUNT(*)::int AS n FROM uploaded_documents WHERE review_status = 'Approved'"),
    count("SELECT COUNT(*)::int AS n FROM uploaded_documents WHERE review_status = 'Rejected'"),
    count("SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE status IN ('Approved','Completed')"),
    count("SELECT COUNT(*)::int AS n FROM student_deficiencies WHERE status IN ('Pending','Under Review','Rejected')"),
    countP("SELECT COUNT(*)::int AS n FROM notifications WHERE status = 'Unread' AND receiver_id=$1", [user.user_id]),
    // Only students who still have open/pending deficiencies — cleared students are excluded
    many(
      `SELECT u.user_id, u.first_name, u.last_name, u.role, u.student_number, u.school_year, u.semester, u.status,
              COUNT(*) FILTER (WHERE sd.status IN ('Pending','Under Review','Rejected'))::int AS open_deficiencies,
              COUNT(*) FILTER (WHERE sd.status IN ('Completed','Approved'))::int AS cleared_deficiencies
       FROM users u
       JOIN student_deficiencies sd ON sd.user_id = u.user_id
       WHERE u.role IN ('Freshman','Transferee','Graduating')
       GROUP BY u.user_id
       HAVING COUNT(*) FILTER (WHERE sd.status IN ('Pending','Under Review','Rejected')) > 0
       ORDER BY open_deficiencies DESC, u.last_name, u.first_name
       LIMIT 12`
    ),
    // Recent open assignments only — do not list cleared items
    many(
      `SELECT sd.student_deficiency_id, sd.status, sd.assigned_date, u.first_name, u.last_name, u.role,
              u.student_number, u.school_year, u.semester, dt.deficiency_name
       FROM student_deficiencies sd
       JOIN users u ON u.user_id = sd.user_id
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       WHERE sd.status IN ('Pending','Under Review','Rejected')
       ORDER BY sd.student_deficiency_id DESC
       LIMIT 10`
    ),
  ]);

  const stats = { students, pending, approved, rejected, completed, openDefs, unread };

  return json({ ok: true, stats, unclearedStudents, recent });
}
