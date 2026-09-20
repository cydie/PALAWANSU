'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function LogsPage() {
  const [q, setQ] = useState('');
  const [logs, setLogs] = useState([]);

  async function load(next = q) {
    const data = await api(`/api/admin/logs?q=${encodeURIComponent(next)}`);
    setLogs(data.logs);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <div className="panel">
      <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <div className="col-12 col-md-8">
          <input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions or users…" />
        </div>
        <div className="col-12 col-md-4 col-lg-3">
          <button className="btn btn-primary w-100"><i className="bi bi-search" /> Search</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm table-striped">
          <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.log_id}>
                <td className="text-nowrap">{l.log_time}</td>
                <td>{l.username ? `${l.first_name} ${l.last_name} (${l.username})` : 'Guest / system'}</td>
                <td>{l.role || '—'}</td>
                <td>{l.action}</td>
              </tr>
            ))}
            {!logs.length ? <tr><td colSpan={4} className="text-center text-muted">No logs found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
