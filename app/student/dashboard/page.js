'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/api/student/dashboard').then(setData).catch(() => {}); }, []);
  if (!data) return <div className="text-muted">Loading dashboard…</div>;
  const { stats, defs } = data;

  return (
    <>
      <div className="row g-3 mb-3">
        {[
          ['bi-journal-text', 'Total deficiencies', stats.total],
          ['bi-exclamation-circle', 'Pending / rejected', stats.pending],
          ['bi-hourglass-split', 'Under review', stats.review],
          ['bi-check2-circle', 'Completed', stats.done],
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
      <div className="panel">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div className="panel-title mb-0">My deficiencies</div>
          <Link href="/student/upload" className="btn btn-sm btn-primary"><i className="bi bi-cloud-arrow-up" /> Upload documents</Link>
        </div>
        {!defs.length ? (
          <div className="empty-state">No deficiencies assigned yet. Check back after the registrar updates your record.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Requirement</th><th>Document</th><th>Status</th></tr></thead>
              <tbody>
                {defs.map((d) => (
                  <tr key={d.student_deficiency_id}>
                    <td>{d.deficiency_name}</td>
                    <td className="small text-muted">{d.required_document}</td>
                    <td><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
