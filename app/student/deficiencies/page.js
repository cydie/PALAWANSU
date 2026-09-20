'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function StudentDeficienciesPage() {
  const [status, setStatus] = useState('All');
  const [rows, setRows] = useState([]);

  async function load(next = status) {
    setRows((await api(`/api/student/deficiencies?status=${encodeURIComponent(next)}`)).rows);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <div className="panel">
      <form className="row g-2 mb-3">
        <div className="col-12 col-sm-6 col-lg-4">
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value); }}>
            {['All', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Completed'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </form>
      {!rows.length ? <div className="empty-state">No deficiencies match this filter.</div> : (
        <div className="table-responsive">
          <table className="table">
            <thead><tr><th>Deficiency</th><th>Required document</th><th>Assigned</th><th>Status</th><th>Remarks</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_deficiency_id}>
                  <td>
                    <strong>{r.deficiency_name}</strong>
                    {r.description ? <div className="small text-muted">{r.description}</div> : null}
                  </td>
                  <td>{r.required_document}</td>
                  <td>{String(r.assigned_date).slice(0, 10)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="small">{r.remarks || '—'}</td>
                  <td>
                    {['Pending', 'Rejected'].includes(r.status) ? (
                      <Link className="btn btn-sm btn-primary" href={`/student/upload?sd=${r.student_deficiency_id}`}>Upload</Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
