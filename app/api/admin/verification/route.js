import { json, requireStaff } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { logAction, notifyStudent } from '@/lib/notify';

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
  const documents = await many(sql, params);

  // Attach latest review note for each doc
  for (const doc of documents) {
    const review = await one(
      `SELECT dr.review_action, dr.review_remarks, dr.reviewed_at, u.first_name, u.last_name
       FROM document_reviews dr
       JOIN users u ON u.user_id = dr.reviewed_by
       WHERE dr.document_id=$1
       ORDER BY dr.reviewed_at DESC LIMIT 1`,
      [doc.document_id]
    );
    doc.last_review = review || null;
  }

  return json({ ok: true, documents });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const action = String(body.review_action || body.action || '');
  const docId = Number(body.document_id || 0);
  const remarks = String(body.review_remarks || '').trim();

  if (action === 'Reopen') {
    const sdId = Number(body.student_deficiency_id || 0);
    const sd = await one('SELECT * FROM student_deficiencies WHERE student_deficiency_id=$1', [sdId]);
    if (!sd) return json({ ok: false, error: 'Deficiency not found.' }, 404);
    if (!['Completed', 'Approved'].includes(sd.status)) {
      return json({ ok: false, error: 'Only cleared deficiencies can be reopened.' }, 422);
    }
    if (!remarks) {
      return json({ ok: false, error: 'Remarks are required when reopening a cleared deficiency.' }, 422);
    }
    await query(
      "UPDATE student_deficiencies SET status='Rejected', completion_date=NULL, remarks=$2 WHERE student_deficiency_id=$1",
      [sdId, remarks]
    );
    await logAction(user.user_id, `Reopened deficiency #${sdId}: ${remarks}`);
    await notifyStudent(
      user.user_id,
      sd.user_id,
      'Deficiency reopened',
      `A cleared requirement was reopened by the registrar. Reason: ${remarks}`
    );
    return json({ ok: true, message: 'Deficiency reopened. Student may upload again.' });
  }

  if (!['Approved', 'Rejected', 'Under Review'].includes(action) || docId < 1) {
    return json({ ok: false, error: 'Invalid review action.' }, 422);
  }
  if (action === 'Rejected' && !remarks) {
    return json({ ok: false, error: 'Remarks are required when rejecting a document.' }, 422);
  }

  const doc = await one(
    `SELECT ud.*, sd.user_id AS student_id, sd.student_deficiency_id, sd.status AS def_status, dt.deficiency_name
     FROM uploaded_documents ud
     JOIN student_deficiencies sd ON sd.student_deficiency_id = ud.student_deficiency_id
     JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
     WHERE ud.document_id = $1`,
    [docId]
  );
  if (!doc) return json({ ok: false, error: 'Document not found.' }, 404);

  if (['Approved', 'Rejected'].includes(doc.review_status) && action !== 'Under Review') {
    // Allow changing decision only via explicit re-review of Pending/Under Review docs
    // If already final, require reopen path for deficiency
    if (doc.review_status === action) {
      return json({ ok: false, error: `Document is already ${action}.` }, 422);
    }
  }
  if (doc.review_status === 'Approved' && action !== 'Approved') {
    return json({
      ok: false,
      error: 'This document was already approved. Reopen the deficiency if a correction is needed.',
    }, 422);
  }

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
      // Clear this requirement; reject sibling non-approved uploads
      await query(
        `UPDATE uploaded_documents
         SET review_status='Rejected',
             remarks=COALESCE(NULLIF(remarks,''), 'Superseded — another submission was approved')
         WHERE student_deficiency_id=$1 AND document_id<>$2 AND review_status IN ('Pending','Under Review')`,
        [doc.student_deficiency_id, docId]
      );
      await query(
        "UPDATE student_deficiencies SET status='Completed', completion_date=CURRENT_DATE WHERE student_deficiency_id=$1",
        [doc.student_deficiency_id]
      );
    } else if (action === 'Rejected') {
      await query(
        "UPDATE student_deficiencies SET status='Rejected', completion_date=NULL WHERE student_deficiency_id=$1",
        [doc.student_deficiency_id]
      );
    } else {
      await query(
        "UPDATE student_deficiencies SET status='Under Review', completion_date=NULL WHERE student_deficiency_id=$1",
        [doc.student_deficiency_id]
      );
    }
    await query('COMMIT');
  } catch (err) {
    await query('ROLLBACK');
    return json({ ok: false, error: err.message }, 500);
  }

  let msg = `Your submission for “${doc.deficiency_name}” was marked ${action}.`;
  if (action === 'Approved') {
    msg = `Your submission for “${doc.deficiency_name}” was approved. This deficiency is now cleared.`;
  } else if (action === 'Rejected') {
    msg = `Your submission for “${doc.deficiency_name}” was rejected. Please upload a corrected document.`;
  }
  if (remarks) msg += ` Remarks: ${remarks}`;
  await notifyStudent(user.user_id, doc.student_id, `Document ${action.toLowerCase()}`, msg);
  await logAction(user.user_id, `Reviewed document #${docId} as ${action}`);
  return json({
    ok: true,
    message:
      action === 'Approved'
        ? 'Document approved. Deficiency cleared (Completed).'
        : `Document marked as ${action}.`,
  });
}
