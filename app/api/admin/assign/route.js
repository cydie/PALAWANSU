import { json, requireStaff, fullName } from '@/lib/auth';
import { many, one } from '@/lib/db';
import { logAction, sendNotification } from '@/lib/notify';

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

  const row = await one(
    `INSERT INTO student_deficiencies (user_id, deficiency_id, remarks, status, assigned_date)
     VALUES ($1,$2,$3,'Pending', CURRENT_DATE) RETURNING *`,
    [studentId, defId, remarks || null]
  );
  await logAction(user.user_id, `Assigned deficiency #${defId} to student #${studentId} (sd #${row.student_deficiency_id})`);
  if (notify) {
    await sendNotification(
      user.user_id,
      studentId,
      'New deficiency assigned',
      `You have a new deficiency: ${def.deficiency_name}. Required document: ${def.required_document}.`,
      'System'
    );
    await sendNotification(
      user.user_id,
      studentId,
      'Deficiency reminder',
      `Please upload: ${def.required_document}`,
      'Email'
    );
  }
  return json({ ok: true, assigned: row, message: `Deficiency assigned to ${fullName(student)}.` });
}
