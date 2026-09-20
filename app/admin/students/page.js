'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [edit, setEdit] = useState(null);
  const [flash, setFlash] = useState('');

  async function load(nextQ = q, nextCat = category) {
    const params = new URLSearchParams({ q: nextQ, category: nextCat });
    const data = await api(`/api/admin/students?${params}`);
    setStudents(data.students);
  }

  useEffect(() => { load().catch((err) => setFlash(err.message)); }, []);

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/admin/students', { method: 'POST', body: JSON.stringify(Object.fromEntries(form.entries())) });
    setEdit(null);
    setFlash('Student updated.');
    await load();
  }

  return (
    <div className="panel">
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <div className="col-12 col-md-5">
          <input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, email…" />
        </div>
        <div className="col-12 col-sm-6 col-md-4">
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {['All', 'Freshman', 'Transferee', 'Graduating'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <button className="btn btn-primary w-100"><i className="bi bi-funnel" /> Filter</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead><tr><th>Student</th><th>Student Number</th><th>Category</th><th>Email</th><th>Status</th><th /></tr></thead>
          <tbody>
            {!students.length ? <tr><td colSpan={6} className="text-center text-muted py-4">No students found.</td></tr> : null}
            {students.map((s) => (
              <tr key={s.user_id}>
                <td>{s.first_name} {s.last_name}</td>
                <td>{s.student_number || '—'}</td>
                <td>{s.role}</td>
                <td>{s.email}</td>
                <td><StatusBadge status={s.status} /></td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#editStudent" onClick={() => setEdit(s)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal fade" id="editStudent" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
          <form className="modal-content" onSubmit={save} key={edit?.user_id || 'closed'}>
            <input type="hidden" name="user_id" value={edit?.user_id || ''} />
            <div className="modal-header">
              <h5 className="modal-title">Edit student</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body row g-3">
              <div className="col-md-6"><label className="form-label">First name</label><input name="first_name" className="form-control" defaultValue={edit?.first_name || ''} required /></div>
              <div className="col-md-6"><label className="form-label">Last name</label><input name="last_name" className="form-control" defaultValue={edit?.last_name || ''} required /></div>
              <div className="col-12"><label className="form-label">Middle name</label><input name="middle_name" className="form-control" defaultValue={edit?.middle_name || ''} /></div>
              <div className="col-md-6"><label className="form-label">Student Number</label><input name="student_number" className="form-control" defaultValue={edit?.student_number || ''} /></div>
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <select name="role" className="form-select" defaultValue={edit?.role || 'Freshman'}>
                  <option>Freshman</option><option>Transferee</option><option>Graduating</option>
                </select>
              </div>
              <div className="col-md-8"><label className="form-label">Email</label><input type="email" name="email" className="form-control" defaultValue={edit?.email || ''} required /></div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select name="status" className="form-select" defaultValue={edit?.status || 'Active'}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-primary" data-bs-dismiss="modal">Save</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
