import { json, requireStaff, fullName, typeAppliesTo } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { logAction, notifyStudent } from '@/lib/notify';

export async function GET() {
  const { error } = await requireStaff();
  if (error) return error;
  const [students, types, assigned] = await Promise.all([
    many(
      `SELECT user_id, first_name, last_name, middle_name, student_number, role
       FROM users WHERE role IN ('Freshman','Transferee','Graduating') AND status='Active'
       ORDER BY last_name, first_name`
    ),
    many('SELECT * FROM deficiency_types ORDER BY deficiency_name'),
    many(
      `SELECT sd.*, u.first_name, u.last_name, u.role, u.student_number, dt.deficiency_name
       FROM student_deficiencies sd
       JOIN users u ON u.user_id = sd.user_id
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       ORDER BY sd.student_deficiency_id DESC LIMIT 50`
    ),
  ]);
  return json({ ok: true, students, types, assigned });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'assign');

  if (action === 'cancel') {
    const sdId = Number(body.student_deficiency_id || 0);
    const row = await one(
      `SELECT sd.*, dt.deficiency_name FROM student_deficiencies sd
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       WHERE sd.student_deficiency_id=$1`,
      [sdId]
    );
    if (!row) return json({ ok: false, error: 'Assignment not found.' }, 404);
    if (['Completed', 'Approved'].includes(row.status)) {
      return json({ ok: false, error: 'Cannot cancel a cleared deficiency. Reopen it from Verification if needed.' }, 422);
    }
    const hasApproved = await one(
      "SELECT document_id FROM uploaded_documents WHERE student_deficiency_id=$1 AND review_status='Approved' LIMIT 1",
      [sdId]
    );
    if (hasApproved) {
      return json({ ok: false, error: 'Cannot cancel — an approved document already exists for this item.' }, 422);
    }
    await query('DELETE FROM student_deficiencies WHERE student_deficiency_id=$1', [sdId]);
    await logAction(user.user_id, `Cancelled deficiency assignment #${sdId} (${row.deficiency_name})`);
    return json({ ok: true, message: 'Assignment cancelled.' });
  }

  if (action === 'bulk') {
    const category = String(body.category || '');
    const defId = Number(body.deficiency_id || 0);
    const remarks = String(body.remarks || '').trim();
    const notify = Boolean(body.notify);
    if (!['Freshman', 'Transferee', 'Graduating'].includes(category)) {
      return json({ ok: false, error: 'Select a student category for bulk assign.' }, 422);
    }
    const def = await one('SELECT * FROM deficiency_types WHERE deficiency_id=$1', [defId]);
    if (!def) return json({ ok: false, error: 'Select a valid deficiency type.' }, 422);
    if (!typeAppliesTo(def.applies_to, category)) {
      return json({ ok: false, error: `“${def.deficiency_name}” does not apply to ${category} students.` }, 422);
    }
    const students = await many(
      "SELECT * FROM users WHERE role=$1 AND status='Active' ORDER BY last_name",
      [category]
    );
    let created = 0;
    let skipped = 0;
    for (const student of students) {
      const open = await one(
        `SELECT student_deficiency_id FROM student_deficiencies
         WHERE user_id=$1 AND deficiency_id=$2 AND status IN ('Pending','Under Review','Rejected')
         LIMIT 1`,
        [student.user_id, defId]
      );
      if (open) {
        skipped += 1;
        continue;
      }
      const cleared = await one(
        `SELECT student_deficiency_id FROM student_deficiencies
         WHERE user_id=$1 AND deficiency_id=$2 AND status IN ('Completed','Approved')
         LIMIT 1`,
        [student.user_id, defId]
      );
      if (cleared) {
        skipped += 1;
        continue;
      }
      await query(
        `INSERT INTO student_deficiencies (user_id, deficiency_id, remarks, status, assigned_date)
         VALUES ($1,$2,$3,'Pending', CURRENT_DATE)`,
        [student.user_id, defId, remarks || null]
      );
      created += 1;
      if (notify) {
        await notifyStudent(
          user.user_id,
          student.user_id,
          'New documentary requirement',
          `The registrar assigned “${def.deficiency_name}”. Please upload: ${def.required_document}.`
        );
      }
    }
    await logAction(user.user_id, `Bulk assigned ${def.deficiency_name} to ${category}: ${created} created, ${skipped} skipped`);
    return json({
      ok: true,
      message: `Assigned to ${created} ${category} student(s). Skipped ${skipped} (already open or cleared).`,
    });
  }

  const studentId = Number(body.user_id || 0);
  const defId = Number(body.deficiency_id || 0);
  const remarks = String(body.remarks || '').trim();
  const notify = Boolean(body.notify);

  const student = await one(
    "SELECT * FROM users WHERE user_id=$1 AND role IN ('Freshman','Transferee','Graduating') AND status='Active'",
    [studentId]
  );
  const def = await one('SELECT * FROM deficiency_types WHERE deficiency_id=$1', [defId]);
  if (!student || !def) {
    return json({ ok: false, error: 'Select a valid student and deficiency type.' }, 422);
  }
  if (!typeAppliesTo(def.applies_to, student.role)) {
    return json({
      ok: false,
      error: `“${def.deficiency_name}” does not apply to ${student.role} students.`,
    }, 422);
  }

  const open = await one(
    `SELECT student_deficiency_id, status FROM student_deficiencies
     WHERE user_id=$1 AND deficiency_id=$2 AND status IN ('Pending','Under Review','Rejected')
     LIMIT 1`,
    [studentId, defId]
  );
  if (open) {
    return json({
      ok: false,
      error: `This student already has an open “${def.deficiency_name}” deficiency (${open.status}).`,
    }, 409);
  }

  const row = await one(
    `INSERT INTO student_deficiencies (user_id, deficiency_id, remarks, status, assigned_date)
     VALUES ($1,$2,$3,'Pending', CURRENT_DATE) RETURNING *`,
    [studentId, defId, remarks || null]
  );
  await logAction(
    user.user_id,
    `Assigned deficiency #${defId} to student #${studentId} (sd #${row.student_deficiency_id})`
  );
  if (notify) {
    await notifyStudent(
      user.user_id,
      studentId,
      'New documentary requirement',
      `You have a new deficiency: ${def.deficiency_name}. Required document: ${def.required_document}.`
    );
  }
  return json({ ok: true, assigned: row, message: `Deficiency assigned to ${fullName(student)}.` });
}
