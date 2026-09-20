'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('Deficiency Report');
  const [classification, setClassification] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [generated, setGenerated] = useState(false);

  async function loadHistory() {
    const data = await api('/api/admin/reports');
    setHistory(data.history);
  }
  useEffect(() => { loadHistory().catch(() => {}); }, []);

  async function generate(event) {
    event.preventDefault();
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
    setGenerated(true);
  }

  return (
    <>
      <div className="panel no-print">
        <div className="panel-title">Generate report</div>
        <form className="row g-3" onSubmit={generate}>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label">Report type</label>
            <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {['Deficiency Report', 'Completion Report', 'Notification Report'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label">Classification</label>
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
          <div className="col-12 col-xl-2 d-flex align-items-end gap-2">
            <button className="btn btn-primary flex-fill"><i className="bi bi-play-circle" /> Generate</button>
            {generated ? <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}><i className="bi bi-printer" /> Print</button> : null}
          </div>
        </form>
      </div>

      {generated ? (
        <div className="panel">
          <div className="panel-title">{reportType} · {classification} ({rows.length} rows)</div>
          <div className="table-responsive">
            {reportType === 'Notification Report' ? (
              <table className="table table-sm table-bordered">
                <thead><tr><th>Sender</th><th>Receiver</th><th>Type</th><th>Title</th><th>Status</th><th>Sent</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.notification_id}>
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
            ) : (
              <table className="table table-sm table-bordered">
                <thead><tr><th>Student</th><th>Student Number</th><th>Category</th><th>Deficiency</th><th>Status</th><th>Assigned</th><th>Completed</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.student_deficiency_id}>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.student_number}</td>
                      <td>{r.role}</td>
                      <td>{r.deficiency_name}</td>
                      <td>{r.status}</td>
                      <td>{String(r.assigned_date || '').slice(0, 10)}</td>
                      <td>{r.completion_date ? String(r.completion_date).slice(0, 10) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!rows.length ? <div className="empty-state">No records match the filters.</div> : null}
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
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
