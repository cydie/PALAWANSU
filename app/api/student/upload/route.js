import { json, requireStudent, fullName } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { saveDocument } from '@/lib/upload';
import { logAction, notifyStaff } from '@/lib/notify';

export async function GET() {
  const { user, error } = await requireStudent();
  if (error) return error;
  const options = await many(
    `SELECT sd.student_deficiency_id, sd.status, dt.deficiency_name, dt.required_document
     FROM student_deficiencies sd
     JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
     WHERE sd.user_id=$1 AND sd.status IN ('Pending','Rejected','Under Review')
     ORDER BY dt.deficiency_name`,
    [user.user_id]
  );
  return json({ ok: true, options });
}

export async function POST(request) {
  const { user, error } = await requireStudent();
  if (error) return error;
  const form = await request.formData();
  const sdId = Number(form.get('student_deficiency_id') || 0);
  const file = form.get('document');
  const sd = await one(
    `SELECT sd.*, dt.deficiency_name FROM student_deficiencies sd
     JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
     WHERE sd.student_deficiency_id=$1 AND sd.user_id=$2`,
    [sdId, user.user_id]
  );
  if (!sd) return json({ ok: false, error: 'Invalid deficiency selection.' }, 422);
  if (!['Pending', 'Rejected', 'Under Review'].includes(sd.status)) {
    return json({ ok: false, error: 'This deficiency no longer accepts uploads.' }, 422);
  }
  const result = await saveDocument(file, sdId);
  if (!result.ok) return json(result, 422);
  await query(
    `INSERT INTO uploaded_documents (student_deficiency_id, file_name, file_path, file_type, review_status)
     VALUES ($1,$2,$3,$4,'Pending')`,
    [sdId, result.name, result.path, result.type]
  );
  await query("UPDATE student_deficiencies SET status='Under Review' WHERE student_deficiency_id=$1", [sdId]);
  await notifyStaff('New document submitted', `${fullName(user)} uploaded a document for "${sd.deficiency_name}".`, user.user_id);
  await logAction(user.user_id, `Uploaded document for deficiency #${sdId}`);
  return json({ ok: true, message: 'Document uploaded. Waiting for registrar verification.' });
}
