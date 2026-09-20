'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function StudentNotificationsPage() {
  const [rows, setRows] = useState([]);
  const [flash, setFlash] = useState('');

  async function load() {
    setRows((await api('/api/student/notifications')).rows);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function mark(id) {
    await api('/api/student/notifications', { method: 'POST', body: JSON.stringify({ notification_id: id }) });
    await load();
  }
  async function markAll() {
    const data = await api('/api/student/notifications', { method: 'POST', body: JSON.stringify({ action: 'mark_all' }) });
    setFlash(data.message);
    await load();
  }

  return (
    <div className="panel">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="panel-title mb-0">Inbox</div>
        {rows.length ? <button className="btn btn-sm btn-outline-secondary" onClick={markAll}>Mark all read</button> : null}
      </div>
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      {!rows.length ? <div className="empty-state">No notifications.</div> : (
        <div className="list-group">
          {rows.map((n) => (
            <div className="list-group-item" key={n.notification_id}>
              <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
                <div>
                  <strong>{n.title}</strong>
                  <div className="small text-muted">
                    {n.notification_type} · {n.sent_at}
                    {n.first_name ? ` · from ${n.first_name} ${n.last_name}` : ''}
                  </div>
                  <p className="mb-0 mt-1">{n.message}</p>
                </div>
                <div className="text-end">
                  <StatusBadge status={n.status} />
                  {n.status === 'Unread' ? (
                    <div className="mt-2"><button className="btn btn-sm btn-outline-primary" onClick={() => mark(n.notification_id)}>Mark read</button></div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
