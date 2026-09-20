import { json, requireStudent } from '@/lib/auth';
import { many } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireStudent();
  if (error) return error;
  const rows = await many(
    `SELECT ud.*, sd.status AS def_status, dt.deficiency_name, dt.required_document
     FROM uploaded_documents ud
     JOIN student_deficiencies sd ON sd.student_deficiency_id = ud.student_deficiency_id
     JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
     WHERE sd.user_id = $1
     ORDER BY ud.uploaded_at DESC`,
    [user.user_id]
  );
  return json({ ok: true, rows });
}
