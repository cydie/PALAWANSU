'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/dashboard').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="text-muted">Loading dashboard…</div>;
  const { stats, recent } = data;

  return (
    <>
      <div className="row g-3 mb-3">
        {[
          ['bi-people', 'Students', stats.students],
          ['bi-clipboard-check', 'Assigned deficiencies', stats.deficiencies],
          ['bi-hourglass-split', 'Pending reviews', stats.pending],
          ['bi-check2-circle', 'Completed', stats.completed],
        ].map(([icon, label, value]) => (
          <div className="col-6 col-xl-3" key={label}>
            <div className="stat-card">
              <div className="stat-icon"><i className={`bi ${icon}`} /></div>
              <div className="label">{label}</div>
              <div className="value">{value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="panel">
            <div className="panel-title">Recent deficiency assignments</div>
            {!recent.length ? (
              <div className="empty-state">No deficiencies assigned yet. <Link href="/admin/assign">Assign one</Link>.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead><tr><th>Student</th><th>Category</th><th>Deficiency</th><th>Status</th><th>Assigned</th></tr></thead>
                  <tbody>
                    {recent.map((row) => (
                      <tr key={row.student_deficiency_id}>
                        <td>{row.first_name} {row.last_name}</td>
                        <td>{row.role}</td>
                        <td>{row.deficiency_name}</td>
                        <td><StatusBadge status={row.status} /></td>
                        <td>{String(row.assigned_date).slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-4">
          <div className="panel">
            <div className="panel-title">Document overview</div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between"><span>Approved</span><strong>{stats.approved}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Rejected</span><strong>{stats.rejected}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Unread notifications</span><strong>{stats.unread}</strong></li>
            </ul>
            <Link className="btn btn-primary w-100 mt-3" href="/admin/verification">Go to verification</Link>
          </div>
        </div>
      </div>
    </>
  );
}
