import { json, requireStaff } from '@/lib/auth';
import { many, query } from '@/lib/db';
import { logAction } from '@/lib/notify';

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
    return json({ ok: true, rows: [], history, reportType, classification });
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
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND sd.assigned_date >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND sd.assigned_date <= $${params.length}`;
    }
    sql += ' ORDER BY sd.assigned_date DESC, u.last_name';
    rows = await many(sql, params);
  }

  await query(
    'INSERT INTO report_logs (generated_by, report_type, date_from, date_to, classification) VALUES ($1,$2,$3,$4,$5)',
    [user.user_id, reportType, dateFrom || null, dateTo || null, classification]
  );
  await logAction(user.user_id, `Generated ${reportType}`);
  return json({ ok: true, rows, history, reportType, classification });
}
