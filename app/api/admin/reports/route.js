import { json, requireStaff, fullName } from '@/lib/auth';
import { many, query } from '@/lib/db';
import { logAction } from '@/lib/notify';

const REPORT_TYPES = [
  'Deficiency Report',
  'Completion Report',
  'Open Deficiencies',
  'Cleared Students',
  'Notification Report',
];

export async function GET(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('report_type') || 'Deficiency Report';
  const classification = searchParams.get('classification') || 'All';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const generate = searchParams.get('generate') === '1';

  const history = await many(
    `SELECT rl.*, u.first_name, u.last_name FROM report_logs rl
     JOIN users u ON u.user_id = rl.generated_by
     ORDER BY rl.generated_at DESC LIMIT 15`
  );

  if (!generate) {
    return json({
      ok: true,
      rows: [],
      history,
      reportType,
      classification,
      preparedBy: fullName(user),
      preparedRole: user.role,
    });
  }

  if (!REPORT_TYPES.includes(reportType)) {
    return json({ ok: false, error: 'Invalid report type.' }, 422);
  }

  let rows = [];

  if (reportType === 'Notification Report') {
    const params = [];
    let sql = `SELECT n.*, su.first_name AS sfirst, su.last_name AS slast, ru.first_name AS rfirst, ru.last_name AS rlast
               FROM notifications n
               LEFT JOIN users su ON su.user_id = n.sender_id
               JOIN users ru ON ru.user_id = n.receiver_id
               WHERE 1=1`;
    if (['Freshman', 'Transferee', 'Graduating'].includes(classification)) {
      params.push(classification);
      sql += ` AND ru.role = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND DATE(n.sent_at) >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND DATE(n.sent_at) <= $${params.length}`;
    }
    sql += ' ORDER BY n.sent_at DESC';
    rows = await many(sql, params);
  } else if (reportType === 'Cleared Students') {
    const params = [];
    let sql = `SELECT u.user_id, u.first_name, u.last_name, u.student_number, u.role,
                      COUNT(sd.student_deficiency_id)::int AS total_deficiencies,
                      COUNT(*) FILTER (WHERE sd.status IN ('Completed','Approved'))::int AS cleared,
                      COUNT(*) FILTER (WHERE sd.status NOT IN ('Completed','Approved'))::int AS open_count
               FROM users u
               JOIN student_deficiencies sd ON sd.user_id = u.user_id
               WHERE u.role IN ('Freshman','Transferee','Graduating')`;
    if (['Freshman', 'Transferee', 'Graduating'].includes(classification)) {
      params.push(classification);
      sql += ` AND u.role = $${params.length}`;
    }
    sql += ` GROUP BY u.user_id, u.first_name, u.last_name, u.student_number, u.role
             HAVING COUNT(*) FILTER (WHERE sd.status NOT IN ('Completed','Approved')) = 0
                AND COUNT(sd.student_deficiency_id) > 0
             ORDER BY u.last_name, u.first_name`;
    rows = await many(sql, params);
  } else if (reportType === 'Open Deficiencies') {
    const params = [];
    let sql = `SELECT sd.*, u.first_name, u.last_name, u.role, u.student_number, dt.deficiency_name, dt.required_document
               FROM student_deficiencies sd
               JOIN users u ON u.user_id = sd.user_id
               JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
               WHERE sd.status IN ('Pending','Under Review','Rejected')`;
    if (['Freshman', 'Transferee', 'Graduating'].includes(classification)) {
      params.push(classification);
      sql += ` AND u.role = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND sd.assigned_date >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND sd.assigned_date <= $${params.length}`;
    }
    sql += ' ORDER BY sd.assigned_date ASC, u.last_name';
    rows = await many(sql, params);
  } else {
    const params = [];
    let sql = `SELECT sd.*, u.first_name, u.last_name, u.role, u.student_number, dt.deficiency_name, dt.required_document
               FROM student_deficiencies sd
               JOIN users u ON u.user_id = sd.user_id
               JOIN deficiency_types dt ON dt.deficiency_id = sd.deficiency_id
               WHERE 1=1`;
    if (['Freshman', 'Transferee', 'Graduating'].includes(classification)) {
      params.push(classification);
      sql += ` AND u.role = $${params.length}`;
    }
    if (reportType === 'Completion Report') {
      sql += " AND sd.status IN ('Approved','Completed')";
      if (dateFrom) {
        params.push(dateFrom);
        sql += ` AND sd.completion_date >= $${params.length}`;
      }
      if (dateTo) {
        params.push(dateTo);
        sql += ` AND sd.completion_date <= $${params.length}`;
      }
    } else {
      if (dateFrom) {
        params.push(dateFrom);
        sql += ` AND sd.assigned_date >= $${params.length}`;
      }
      if (dateTo) {
        params.push(dateTo);
        sql += ` AND sd.assigned_date <= $${params.length}`;
      }
    }
    sql += ' ORDER BY sd.assigned_date DESC, u.last_name';
    rows = await many(sql, params);
  }

  // Store known types only; map new types into Deficiency Report for CHECK constraint safety
  const logType = ['Deficiency Report', 'Completion Report', 'Notification Report'].includes(reportType)
    ? reportType
    : 'Deficiency Report';

  await query(
    'INSERT INTO report_logs (generated_by, report_type, date_from, date_to, classification) VALUES ($1,$2,$3,$4,$5)',
    [user.user_id, logType, dateFrom || null, dateTo || null, classification]
  );
  await logAction(user.user_id, `Generated ${reportType}`);
  return json({
    ok: true,
    rows,
    history,
    reportType,
    classification,
    preparedBy: fullName(user),
    preparedRole: user.role,
  });
}
