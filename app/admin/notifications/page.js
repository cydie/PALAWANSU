'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function AdminNotificationsPage() {
  const [data, setData] = useState({ students: [], outbox: [] });
  const [receiver, setReceiver] = useState('all_students');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const result = await api('/api/admin/notifications');
    setData({
      students: result.students || [],
      outbox: result.outbox || [],
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function send(event) {
    event.preventDefault();
    setFlash('');
    setError('');
    try {
      const form = new FormData(event.currentTarget);
      const result = await api('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      setFlash(result.message);
      event.currentTarget.reset();
      setReceiver('all_students');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {flash ? <div className="alert alert-success py-2">{flash}</div> : null}
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      <div className="row g-3">
        <div className="col-lg-5">
          <div className="panel">
            <div className="panel-title">Compose notification</div>
            <form onSubmit={send}>
              <div className="mb-3">
                <label className="form-label">Recipients</label>
                <select
                  name="receiver"
                  className="form-select"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                >
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
                  <select name="user_id" className="form-select" required>
                    {data.students.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.last_name}, {s.first_name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="mb-3">
                <label className="form-label">Channel</label>
                <select name="notification_type" className="form-select" defaultValue="System">
                  <option value="System">System (in-app)</option>
                  <option value="Email">Email (requires Settings → SMTP)</option>
                  <option value="SMS">SMS (stub)</option>
                </select>
                <div className="form-text">Email uses the campus SMTP configuration under Settings.</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input name="title" className="form-control" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Message</label>
                <textarea name="message" className="form-control" rows={4} required />
              </div>
              <button className="btn btn-primary w-100">Send</button>
            </form>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="panel">
            <div className="panel-title">Recently sent</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>To</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.outbox.length ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">No sent notifications yet.</td>
                    </tr>
                  ) : null}
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
