import bcrypt from 'bcryptjs';
import {
  currentSchoolYear,
  currentSemester,
  normalizeSchoolYear,
  normalizeSemester,
} from '@/lib/academic';
import { json, requireStaff } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { logAction, notifyStudent } from '@/lib/notify';

const STUDENT_SELECT = `user_id, student_number, first_name, last_name, middle_name, email, role,
  school_year, semester, status, created_at`;

export async function GET(request) {
  const { error } = await requireStaff();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'All';
  const q = (searchParams.get('q') || '').trim();
  const schoolYear = normalizeSchoolYear(searchParams.get('school_year'));
  const semester = normalizeSemester(searchParams.get('semester'));
  const clearance = searchParams.get('clearance') || 'All';
  const detailId = Number(searchParams.get('detail') || 0);

  if (detailId > 0) {
    const students = await many(
      `SELECT ${STUDENT_SELECT}
       FROM users WHERE user_id=$1 AND role IN ('Freshman','Transferee','Graduating')`,
      [detailId]
    );
    if (!students.length) return json({ ok: false, error: 'Student not found.' }, 404);
    const deficiencies = await many(
      `SELECT sd.*, dt.deficiency_name, dt.required_document
       FROM student_deficiencies sd
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       WHERE sd.user_id=$1
       ORDER BY sd.assigned_date DESC`,
      [detailId]
    );
    const uploads = await many(
      `SELECT ud.document_id, ud.student_deficiency_id, ud.file_name, ud.file_path, ud.file_type,
              ud.review_status, ud.remarks, ud.uploaded_at, dt.deficiency_name, dt.required_document
       FROM uploaded_documents ud
       JOIN student_deficiencies sd ON sd.student_deficiency_id = ud.student_deficiency_id
       JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
       WHERE sd.user_id=$1
       ORDER BY ud.uploaded_at DESC`,
      [detailId]
    );
    const open = deficiencies.filter((d) => !['Completed', 'Approved'].includes(d.status)).length;
    const cleared = deficiencies.filter((d) => ['Completed', 'Approved'].includes(d.status)).length;
    return json({
      ok: true,
      student: students[0],
      deficiencies,
      uploads,
      clearance: {
        total: deficiencies.length,
        open,
        cleared,
        status: deficiencies.length === 0 ? 'No assignments' : open === 0 ? 'Cleared' : 'Has open deficiencies',
      },
    });
  }

  const params = [];
  let sql = `SELECT u.user_id, u.student_number, u.first_name, u.last_name, u.middle_name, u.email, u.role,
                    u.school_year, u.semester, u.status, u.created_at,
                    COALESCE(SUM(CASE WHEN sd.status IN ('Pending','Under Review','Rejected') THEN 1 ELSE 0 END),0)::int AS open_deficiencies,
                    COALESCE(SUM(CASE WHEN sd.status IN ('Completed','Approved') THEN 1 ELSE 0 END),0)::int AS cleared_deficiencies,
                    COUNT(sd.student_deficiency_id)::int AS total_deficiencies
             FROM users u
             LEFT JOIN student_deficiencies sd ON sd.user_id = u.user_id
             WHERE u.role IN ('Freshman','Transferee','Graduating')`;
  if (['Freshman', 'Transferee', 'Graduating'].includes(category)) {
    params.push(category);
    sql += ` AND u.role = $${params.length}`;
  }
  if (schoolYear) {
    params.push(schoolYear);
    sql += ` AND u.school_year = $${params.length}`;
  }
  if (semester) {
    params.push(semester);
    sql += ` AND u.semester = $${params.length}`;
  }
  if (clearance === 'PendingAccount') {
    sql += ` AND u.status = 'Pending'`;
  }
  if (q) {
    params.push(`%${q}%`);
    const n = params.length;
    sql += ` AND (
      u.first_name ILIKE $${n}
      OR u.last_name ILIKE $${n}
      OR u.student_number ILIKE $${n}
      OR u.email ILIKE $${n}
      OR COALESCE(u.school_year,'') ILIKE $${n}
      OR COALESCE(u.semester,'') ILIKE $${n}
      OR (COALESCE(u.school_year,'') || ' ' || COALESCE(u.semester,'')) ILIKE $${n}
    )`;
  }
  sql += ` GROUP BY u.user_id`;
  if (clearance === 'Uncleared') {
    sql += ` HAVING COALESCE(SUM(CASE WHEN sd.status IN ('Pending','Under Review','Rejected') THEN 1 ELSE 0 END),0) > 0`;
  } else if (clearance === 'Cleared') {
    sql += ` HAVING COUNT(sd.student_deficiency_id) > 0
             AND COALESCE(SUM(CASE WHEN sd.status IN ('Pending','Under Review','Rejected') THEN 1 ELSE 0 END),0) = 0`;
  }
  sql += ` ORDER BY u.school_year DESC NULLS LAST, u.semester NULLS LAST, u.last_name, u.first_name`;

  const [students, periods] = await Promise.all([
    many(sql, params),
    many(
      `SELECT DISTINCT school_year, semester
       FROM users
       WHERE role IN ('Freshman','Transferee','Graduating')
         AND (school_year IS NOT NULL OR semester IS NOT NULL)
       ORDER BY school_year DESC NULLS LAST, semester NULLS LAST`
    ),
  ]);

  return json({ ok: true, students, periods });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'update');

  if (action === 'set_status') {
    const id = Number(body.user_id || 0);
    const status = String(body.status || '').trim();
    if (id < 1) return json({ ok: false, error: 'Student not found.' }, 404);
    if (!['Active', 'Inactive', 'Pending'].includes(status)) {
      return json({ ok: false, error: 'Choose Active, Inactive, or Pending.' }, 422);
    }
    const target = await one(
      `SELECT user_id, status, first_name, last_name FROM users
       WHERE user_id=$1 AND role IN ('Freshman','Transferee','Graduating')`,
      [id]
    );
    if (!target) return json({ ok: false, error: 'Student not found.' }, 404);
    if (target.status === status) {
      return json({ ok: true, message: `Status is already ${status}.` });
    }
    await query(
      `UPDATE users SET status=$1
       WHERE user_id=$2 AND role IN ('Freshman','Transferee','Graduating')`,
      [status, id]
    );
    await logAction(user.user_id, `Changed student #${id} status to ${status}`);
    if (status === 'Active' && target.status !== 'Active') {
      await notifyStudent(
        user.user_id,
        id,
        'Account activated',
        'Your PSU Rizal student account is now Active. You may sign in and complete your deficiency requirements.'
      );
    } else if (status === 'Inactive') {
      await notifyStudent(
        user.user_id,
        id,
        'Account deactivated',
        'Your PSU Rizal student account was set to Inactive. Contact the registrar if you need access restored.'
      );
    }
    return json({ ok: true, message: `Status updated to ${status}.` });
  }

  const first = String(body.first_name || '').trim();
  const last = String(body.last_name || '').trim();
  const middle = String(body.middle_name || '').trim();
  const email = String(body.email || '').trim();
  const studentNumber = String(body.student_number || '').trim();
  const role = String(body.role || '');
  const status = String(body.status || 'Active');
  const schoolYear = normalizeSchoolYear(body.school_year) || currentSchoolYear();
  const semester = normalizeSemester(body.semester) || currentSemester();

  if (!['Freshman', 'Transferee', 'Graduating'].includes(role)) {
    return json({ ok: false, error: 'Invalid student category.' }, 422);
  }
  if (!['Active', 'Inactive', 'Pending'].includes(status)) {
    return json({ ok: false, error: 'Invalid status.' }, 422);
  }
  if (!first || !last || !email.includes('@') || !studentNumber) {
    return json({ ok: false, error: 'Name, email, and student number are required.' }, 422);
  }
  if (!schoolYear || !semester) {
    return json({ ok: false, error: 'School year and semester/term are required.' }, 422);
  }

  if (action === 'create') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (username.length < 3) {
      return json({ ok: false, error: 'Username must be at least 3 characters.' }, 422);
    }
    if (password.length < 8) {
      return json({ ok: false, error: 'Password must be at least 8 characters.' }, 422);
    }

    const exists = await one(
      'SELECT user_id FROM users WHERE email=$1 OR username=$2 OR student_number=$3 LIMIT 1',
      [email, username, studentNumber]
    );
    if (exists) {
      return json({ ok: false, error: 'Email, username, or student number already exists.' }, 409);
    }

    const inserted = await one(
      `INSERT INTO users (student_number, first_name, last_name, middle_name, email, username, password, role, status, school_year, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING user_id, student_number, first_name, last_name, email, username, role, status, school_year, semester`,
      [
        studentNumber,
        first,
        last,
        middle || null,
        email,
        username,
        await bcrypt.hash(password, 12),
        role,
        status,
        schoolYear,
        semester,
      ]
    );
    await logAction(
      user.user_id,
      `Manually added student ${username} (${studentNumber}) as ${role} for SY ${schoolYear} ${semester}`
    );
    return json({ ok: true, message: 'Student added successfully.', student: inserted });
  }

  const id = Number(body.user_id || 0);
  if (id < 1) return json({ ok: false, error: 'Student not found.' }, 404);

  const before = await one(
    `SELECT status FROM users WHERE user_id=$1 AND role IN ('Freshman','Transferee','Graduating')`,
    [id]
  );
  const updated = await one(
    `UPDATE users SET first_name=$1, last_name=$2, middle_name=$3, email=$4, student_number=$5, role=$6, status=$7,
           school_year=$8, semester=$9
     WHERE user_id=$10 AND role IN ('Freshman','Transferee','Graduating')
     RETURNING user_id, status`,
    [first, last, middle || null, email, studentNumber, role, status, schoolYear, semester, id]
  );
  if (!updated) return json({ ok: false, error: 'Student not found.' }, 404);

  await logAction(user.user_id, `Updated student #${id}`);
  if (before && before.status !== status && status === 'Active') {
    await notifyStudent(
      user.user_id,
      id,
      'Account activated',
      'Your PSU Rizal student account is now Active. You may sign in and complete your deficiency requirements.'
    );
  }
  return json({ ok: true, message: 'Student updated.' });
}
