'use client';

import { useEffect, useMemo, useState } from 'react';
import { SchoolLetterhead, PsuSeal } from '@/components/BrandLogo';
import { api } from '@/lib/client';

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

const REPORT_TYPES = [
  'Deficiency Report',
  'Open Deficiencies',
  'Completion Report',
  'Cleared Students',
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('Open Deficiencies');
  const [classification, setClassification] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedRole, setPreparedRole] = useState('');
  const [error, setError] = useState('');

  async function loadHistory() {
    const data = await api('/api/admin/reports');
    setHistory(data.history);
    setPreparedBy(data.preparedBy || '');
    setPreparedRole(data.preparedRole || '');
  }
  useEffect(() => { loadHistory().catch(() => {}); }, []);

  const subtitle = useMemo(() => {
    const parts = [`Classification: ${classification}`];
    if (dateFrom || dateTo) parts.push(`Period: ${dateFrom || '…'} to ${dateTo || '…'}`);
    parts.push(`Records: ${rows.length}`);
    if (preparedBy) parts.push(`Prepared by: ${preparedBy}`);
    return parts.join(' · ');
  }, [classification, dateFrom, dateTo, rows.length, preparedBy]);

  async function generate(event) {
    event.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams({
        generate: '1',
        report_type: reportType,
        classification,
        date_from: dateFrom,
        date_to: dateTo,
      });
      const data = await api(`/api/admin/reports?${params}`);
      setRows(data.rows);
      setHistory(data.history);
      setPreparedBy(data.preparedBy || '');
      setPreparedRole(data.preparedRole || '');
      setGenerated(true);
      setGeneratedAt(new Date().toLocaleString());
    } catch (err) {
      setError(err.message);
    }
  }

  function saveCsv() {
    if (!rows.length) return;
    let headers;
    let mapRow;
    if (reportType === 'Notification Report') {
      headers = ['Sender', 'Receiver', 'Type', 'Title', 'Status', 'Sent At'];
      mapRow = (r) => [
        `${r.sfirst || ''} ${r.slast || ''}`.trim() || 'System',
        `${r.rfirst || ''} ${r.rlast || ''}`.trim(),
        r.notification_type,
        r.title,
        r.status,
        r.sent_at,
      ];
    } else if (reportType === 'Cleared Students') {
      headers = ['Student Name', 'Student Number', 'Category', 'Total Deficiencies', 'Cleared'];
      mapRow = (r) => [
        `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        r.student_number || '',
        r.role || '',
        r.total_deficiencies,
        r.cleared,
      ];
    } else {
      headers = ['Student Name', 'Student Number', 'Category', 'Deficiency', 'Required Document', 'Status', 'Assigned Date', 'Completed Date'];
      mapRow = (r) => [
        `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        r.student_number || '',
        r.role || '',
        r.deficiency_name || '',
        r.required_document || '',
        r.status || '',
        formatDate(r.assigned_date),
        r.completion_date ? formatDate(r.completion_date) : '',
      ];
    }
    const lines = [
      'Palawan State University - Rizal Campus',
      'Office of the Registrar',
      'Student Deficiency Monitoring System',
      reportType,
      `Classification: ${classification}`,
      `Date From: ${dateFrom || 'N/A'}`,
      `Date To: ${dateTo || 'N/A'}`,
      `Generated: ${generatedAt}`,
      `Prepared by: ${preparedBy} (${preparedRole})`,
      '',
      headers.join(','),
      ...rows.map((r) => mapRow(r).map(csvEscape).join(',')),
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `PSU-Rizal_${reportType.replace(/\s+/g, '-')}_${classification}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="panel no-print">
        <div className="panel-title">Generate official registrar report</div>
        <p className="text-muted small mb-3">
          Produce campus deficiency, clearance, and completion reports for Palawan State University – Rizal Campus.
          Use Print / Save as PDF for letterhead output, or Save as CSV for spreadsheet filing.
        </p>
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        <form className="row g-3" onSubmit={generate}>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label">Report type</label>
            <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label">Student classification</label>
            <select className="form-select" value={classification} onChange={(e) => setClassification(e.target.value)}>
              {['All', 'Freshman', 'Transferee', 'Graduating'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6 col-xl-2">
            <label className="form-label">From</label>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="col-6 col-xl-2">
            <label className="form-label">To</label>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="col-12 col-xl-2 d-flex align-items-end">
            <button className="btn btn-primary w-100"><i className="bi bi-play-circle" /> Generate</button>
          </div>
        </form>
        {generated ? (
          <div className="report-actions mt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>
              <i className="bi bi-printer" /> Print / Save as PDF
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={saveCsv} disabled={!rows.length}>
              <i className="bi bi-filetype-csv" /> Save as CSV
            </button>
          </div>
        ) : null}
      </div>

      {generated ? (
        <div className="panel report-print-area">
          <PsuSeal className="report-watermark" size={320} />
          <SchoolLetterhead
            title={reportType}
            subtitle={subtitle}
            meta={[`Generated: ${generatedAt}`, 'Confidential · For official use only']}
          />
          <div className="panel-title no-print">{reportType} · {classification} ({rows.length} rows)</div>
          <div className="table-responsive">
            {reportType === 'Notification Report' ? (
              <table className="table table-sm table-bordered">
                <thead>
                  <tr><th>#</th><th>Sender</th><th>Receiver</th><th>Type</th><th>Title</th><th>Status</th><th>Sent</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.notification_id}>
                      <td>{i + 1}</td>
                      <td>{`${r.sfirst || ''} ${r.slast || ''}`.trim() || 'System'}</td>
                      <td>{r.rfirst} {r.rlast}</td>
                      <td>{r.notification_type}</td>
                      <td>{r.title}</td>
                      <td>{r.status}</td>
                      <td>{r.sent_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'Cleared Students' ? (
              <table className="table table-sm table-bordered">
                <thead>
                  <tr><th>#</th><th>Student</th><th>Student No.</th><th>Category</th><th>Total</th><th>Cleared</th><th>Clearance</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.user_id}>
                      <td>{i + 1}</td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.student_number}</td>
                      <td>{r.role}</td>
                      <td>{r.total_deficiencies}</td>
                      <td>{r.cleared}</td>
                      <td>Cleared</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>#</th><th>Student</th><th>Student No.</th><th>Category</th>
                    <th>Deficiency</th><th>Required Document</th><th>Status</th><th>Assigned</th><th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.student_deficiency_id}>
                      <td>{i + 1}</td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.student_number}</td>
                      <td>{r.role}</td>
                      <td>{r.deficiency_name}</td>
                      <td>{r.required_document}</td>
                      <td>{r.status === 'Completed' ? 'Cleared' : r.status}</td>
                      <td>{formatDate(r.assigned_date)}</td>
                      <td>{r.completion_date ? formatDate(r.completion_date) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!rows.length ? <div className="empty-state">No records match the filters.</div> : null}
          </div>
          <div className="report-signoff">
            <div className="sig-block">
              <div className="sig-line">{preparedBy || 'Prepared by'}</div>
              <div className="sig-role">{preparedRole || 'Records Staff'} · PSU Rizal</div>
            </div>
            <div className="sig-block">
              <div className="sig-line">Certified correct</div>
              <div className="sig-role">Campus Registrar · PSU Rizal</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="panel no-print">
        <div className="panel-title">Report history</div>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead><tr><th>Type</th><th>Class</th><th>Range</th><th>By</th><th>When</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.report_id}>
                  <td>{h.report_type}</td>
                  <td>{h.classification}</td>
                  <td>{`${h.date_from || '—'} → ${h.date_to || '—'}`}</td>
                  <td>{h.first_name} {h.last_name}</td>
                  <td>{h.generated_at}</td>
                </tr>
              ))}
              {!history.length ? <tr><td colSpan={5} className="text-center text-muted">No reports generated yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
