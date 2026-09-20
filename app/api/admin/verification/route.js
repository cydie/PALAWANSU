import { json, requireStaff } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { logAction, sendNotification } from '@/lib/notify';

export async function GET(request) {
  const { error } = await requireStaff();
  if (error) return error;
  const status = new URL(request.url).searchParams.get('status') || 'Pending';
  const params = [];
  let sql = `SELECT ud.*, sd.status AS def_status, u.first_name, u.last_name, u.role, u.student_number,
                    dt.deficiency_name, dt.required_document
             FROM uploaded_documents ud
             JOIN student_deficiencies sd ON sd.student_deficiency_id = ud.student_deficiency_id
             JOIN users u ON u.user_id = sd.user_id
             JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id`;
  if (status !== 'All') {
    params.push(status);
    sql += ' WHERE ud.review_status = $1';
  }
  sql += ' ORDER BY ud.uploaded_at DESC';
  return json({ ok: true, documents: await many(sql, params) });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const docId = Number(body.document_id || 0);
  const action = String(body.review_action || '');
  const remarks = String(body.review_remarks || '').trim();
  if (!['Approved', 'Rejected', 'Under Review'].includes(action) || docId < 1) {
    return json({ ok: false, error: 'Invalid review action.' }, 422);
  }

  const doc = await one(
    `SELECT ud.*, sd.user_id AS student_id, sd.student_deficiency_id, dt.deficiency_name
     FROM uploaded_documents ud
     JOIN student_deficiencies sd ON sd.student_deficiency_id = ud.student_deficiency_id
     JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
     WHERE ud.document_id = $1`,
    [docId]
  );
  if (!doc) return json({ ok: false, error: 'Document not found.' }, 404);

  const reviewStatus = action === 'Under Review' ? 'Under Review' : action;
  await query('BEGIN');
  try {
    await query('UPDATE uploaded_documents SET review_status=$1, remarks=$2 WHERE document_id=$3', [
      reviewStatus,
      remarks || null,
      docId,
    ]);
    await query(
      'INSERT INTO document_reviews (document_id, reviewed_by, review_action, review_remarks) VALUES ($1,$2,$3,$4)',
      [docId, user.user_id, action, remarks || null]
    );
    if (action === 'Approved') {
      await query(
        "UPDATE student_deficiencies SET status='Completed', completion_date=CURRENT_DATE WHERE student_deficiency_id=$1",
        [doc.student_deficiency_id]
      );
    } else if (action === 'Rejected') {
      await query("UPDATE student_deficiencies SET status='Rejected' WHERE student_deficiency_id=$1", [
        doc.student_deficiency_id,
      ]);
    } else {
      await query("UPDATE student_deficiencies SET status='Under Review' WHERE student_deficiency_id=$1", [
        doc.student_deficiency_id,
      ]);
    }
    await query('COMMIT');
  } catch (err) {
    await query('ROLLBACK');
    return json({ ok: false, error: err.message }, 500);
  }

  let msg = `Your submission for "${doc.deficiency_name}" was marked ${action}.`;
  if (remarks) msg += ` Remarks: ${remarks}`;
  await sendNotification(user.user_id, doc.student_id, `Document ${action.toLowerCase()}`, msg, 'System');
  await sendNotification(user.user_id, doc.student_id, `Document ${action.toLowerCase()}`, msg, 'Email');
  await logAction(user.user_id, `Reviewed document #${docId} as ${action}`);
  return json({ ok: true, message: `Document marked as ${action}.` });
}
