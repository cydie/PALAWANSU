import { json, requireStudent, fullName } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { saveDocument } from '@/lib/upload';
import { logAction, notifyStaff } from '@/lib/notify';

export async function GET() {
  const { user, error } = await requireStudent();
  if (error) return error;
  const options = await many(
    `SELECT sd.student_deficiency_id, sd.status, dt.deficiency_name, dt.required_document,
            EXISTS (
              SELECT 1 FROM uploaded_documents ud
              WHERE ud.student_deficiency_id = sd.student_deficiency_id
            ) AS has_upload
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
    return json({
      ok: false,
      error: 'This deficiency is already cleared and no longer accepts uploads.',
    }, 422);
  }

  const result = await saveDocument(file, sdId);
  if (!result.ok) return json(result, 422);

  const prior = await one(
    `SELECT COUNT(*)::int AS count FROM uploaded_documents WHERE student_deficiency_id=$1`,
    [sdId]
  );
  const isReupload = (prior?.count || 0) > 0;

  await query('BEGIN');
  try {
    // Replace any previous pending/under-review upload (wrong file / new attempt)
    await query(
      `UPDATE uploaded_documents
       SET review_status='Rejected',
           remarks=COALESCE(remarks,'') || CASE WHEN COALESCE(remarks,'')='' THEN '' ELSE ' ' END ||
                   '[Superseded by newer submission]'
       WHERE student_deficiency_id=$1 AND review_status IN ('Pending','Under Review')`,
      [sdId]
    );
    await query(
      `INSERT INTO uploaded_documents (student_deficiency_id, file_name, file_path, file_type, review_status)
       VALUES ($1,$2,$3,$4,'Pending')`,
      [sdId, result.name, result.path, result.type]
    );
    await query(
      "UPDATE student_deficiencies SET status='Under Review', completion_date=NULL WHERE student_deficiency_id=$1",
      [sdId]
    );
    await query('COMMIT');
  } catch (err) {
    await query('ROLLBACK');
    return json({ ok: false, error: err.message }, 500);
  }

  await notifyStaff(
    isReupload ? 'Document re-uploaded' : 'New document submitted',
    `${fullName(user)} ${isReupload ? 'replaced the document' : 'uploaded a document'} for “${sd.deficiency_name}”.`,
    user.user_id
  );
  await logAction(user.user_id, `${isReupload ? 'Re-uploaded' : 'Uploaded'} document for deficiency #${sdId}`);
  return json({
    ok: true,
    message: isReupload
      ? 'New file uploaded. The previous file was replaced and is waiting for registrar verification.'
      : 'Document uploaded. Waiting for registrar verification.',
  });
}
