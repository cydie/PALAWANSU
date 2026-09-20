'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function AssignPage() {
  const [data, setData] = useState({ students: [], types: [], assigned: [] });
  const [flash, setFlash] = useState('');

  async function load() {
    setData(await api('/api/admin/assign'));
  }
  useEffect(() => { load().catch((err) => setFlash(err.message)); }, []);

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      user_id: form.get('user_id'),
      deficiency_id: form.get('deficiency_id'),
      remarks: form.get('remarks'),
      notify: form.get('notify') === 'on',
    };
    const result = await api('/api/admin/assign', { method: 'POST', body: JSON.stringify(payload) });
    setFlash(result.message);
    event.currentTarget.reset();
    await load();
  }

  return (
    <>
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="panel">
            <div className="panel-title">Assign to student</div>
            <form onSubmit={onSubmit}>
              <div className="mb-3">
                <label className="form-label">Student</label>
                <select name="user_id" className="form-select" required defaultValue="">
                  <option value="">Select…</option>
                  {data.students.map((s) => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.last_name}, {s.first_name} ({s.role} · {s.student_number || 'n/a'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Deficiency type</label>
                <select name="deficiency_id" className="form-select" required defaultValue="">
                  <option value="">Select…</option>
                  {data.types.map((t) => <option key={t.deficiency_id} value={t.deficiency_id}>{t.deficiency_name}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Remarks</label>
                <textarea name="remarks" className="form-control" rows={3} />
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" name="notify" id="notify" defaultChecked />
                <label className="form-check-label" htmlFor="notify">Notify student (system + email queue)</label>
              </div>
              <button className="btn btn-primary w-100">Assign</button>
            </form>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="panel">
            <div className="panel-title">Recent assignments</div>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead><tr><th>Student</th><th>Category</th><th>Deficiency</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {data.assigned.map((a) => (
                    <tr key={a.student_deficiency_id}>
                      <td>{a.first_name} {a.last_name}</td>
                      <td>{a.role}</td>
                      <td>{a.deficiency_name}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>{String(a.assigned_date).slice(0, 10)}</td>
                    </tr>
                  ))}
                  {!data.assigned.length ? <tr><td colSpan={5} className="text-center text-muted">No assignments yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
