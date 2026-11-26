'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { formatPeriod } from '@/lib/academic';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const next = await api('/api/admin/dashboard');
      setData(next);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the dashboard.');
    }
  }, []);

  useLiveReload(load, { intervalMs: 3000 });

  if (error && !data) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="text-muted">Loading dashboard…</div>;
  const { stats, recent, unclearedStudents } = data;

  return (
    <>
      <div className="row g-3 mb-3">
        {[
          ['bi-people', 'Students', stats.students],
          ['bi-exclamation-circle', 'Open deficiencies', stats.openDefs],
          ['bi-hourglass-split', 'Pending reviews', stats.pending],
          ['bi-check2-circle', 'Cleared deficiencies', stats.completed],
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
        <div className="col-lg-7">
          <div className="panel">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <div>
                <div className="panel-title mb-0">Students not cleared</div>
                <div className="small text-muted">Only pending / open deficiencies — cleared students are hidden</div>
              </div>
              <Link href="/admin/students?clearance=Uncleared" className="btn btn-sm btn-outline-primary">View all</Link>
            </div>
            {!unclearedStudents?.length ? (
              <div className="empty-state">All assigned students are cleared. No pending names to show.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>SY / Term</th>
                      <th>Open</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unclearedStudents.map((row) => (
                      <tr key={row.user_id}>
                        <td>
                          <div className="fw-semibold">{row.first_name} {row.last_name}</div>
                          <div className="small text-muted">{row.student_number || '—'}</div>
                        </td>
                        <td className="small">{formatPeriod(row.school_year, row.semester)}</td>
                        <td><span className="text-danger fw-semibold">{row.open_deficiencies}</span></td>
                        <td>{row.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="panel mb-3">
            <div className="panel-title">Document reviews</div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between"><span>Pending review</span><strong>{stats.pending}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Approved</span><strong>{stats.approved}</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>Rejected</span><strong>{stats.rejected}</strong></li>
            </ul>
            <Link className="btn btn-primary w-100 mt-3" href="/admin/verification">Go to verification</Link>
          </div>
          <div className="panel mb-0">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <div className="panel-title mb-0">Open assignments</div>
              <span className="small text-muted">Live</span>
            </div>
            {!recent.length ? (
              <div className="empty-state py-3">No open deficiencies. <Link href="/admin/assign">Assign one</Link>.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Deficiency</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((row) => (
                      <tr key={row.student_deficiency_id}>
                        <td>
                          <div className="fw-semibold">{row.first_name} {row.last_name}</div>
                          <div className="small text-muted">{formatPeriod(row.school_year, row.semester)}</div>
                        </td>
                        <td className="small">{row.deficiency_name}</td>
                        <td><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
