'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function AdminNotificationsPage() {
  const [data, setData] = useState({ students: [], inbox: [], outbox: [] });
  const [receiver, setReceiver] = useState('all_students');
  const [flash, setFlash] = useState('');

  async function load() {
    setData(await api('/api/admin/notifications'));
  }
  useEffect(() => { load().catch((err) => setFlash(err.message)); }, []);

  async function send(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setFlash(result.message);
    event.currentTarget.reset();
    await load();
  }

  async function markRead(id) {
    await api('/api/admin/notifications', { method: 'POST', body: JSON.stringify({ action: 'mark_read', notification_id: id }) });
    await load();
  }

  return (
    <>
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      <div className="row g-3">
        <div className="col-lg-5">
          <div className="panel">
            <div className="panel-title">Compose notification</div>
            <form onSubmit={send}>
              <div className="mb-3">
                <label className="form-label">Recipients</label>
                <select name="receiver" className="form-select" value={receiver} onChange={(e) => setReceiver(e.target.value)}>
                  <option value="all_students">All students</option>
                  <option value="Freshman">Freshman only</option>
                  <option value="Transferee">Transferee only</option>
                  <option value="Graduating">Graduating only</option>
                  <option value="specific">Specific student</option>
                </select>
              </div>
              {receiver === 'specific' ? (
                <div className="mb-3">
                  <label className="form-label">Student</label>
                  <select name="user_id" className="form-select">
                    {data.students.map((s) => (
                      <option key={s.user_id} value={s.user_id}>{s.last_name}, {s.first_name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="mb-3">
                <label className="form-label">Channel</label>
                <select name="notification_type" className="form-select">
                  <option value="System">System (in-app)</option>
                  <option value="Email">Email</option>
                  <option value="SMS">SMS (stub)</option>
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Title</label><input name="title" className="form-control" required /></div>
              <div className="mb-3"><label className="form-label">Message</label><textarea name="message" className="form-control" rows={4} required /></div>
              <button className="btn btn-primary w-100">Send</button>
            </form>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="panel">
            <div className="panel-title">Your inbox</div>
            {!data.inbox.length ? <div className="empty-state py-3">No notifications.</div> : (
              <div className="list-group list-group-flush">
                {data.inbox.map((m) => (
                  <div className="list-group-item" key={m.notification_id}>
                    <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
                      <strong>{m.title}</strong>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="small text-muted">{m.notification_type} · {m.sent_at}</div>
                    <p className="mb-1 mt-1">{m.message}</p>
                    {m.status === 'Unread' ? <button className="btn btn-sm btn-outline-secondary" onClick={() => markRead(m.notification_id)}>Mark read</button> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel">
            <div className="panel-title">Recently sent</div>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead><tr><th>To</th><th>Type</th><th>Title</th><th>When</th></tr></thead>
                <tbody>
                  {data.outbox.map((o) => (
                    <tr key={o.notification_id}>
                      <td>{o.first_name} {o.last_name}</td>
                      <td>{o.notification_type}</td>
                      <td>{o.title}</td>
                      <td>{o.sent_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
