'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function UsersPage() {
  const [role, setRole] = useState('All');
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [mode, setMode] = useState('create');
  const [flash, setFlash] = useState('');

  async function load(next = role) {
    setUsers((await api(`/api/admin/users?role=${encodeURIComponent(next)}`)).users);
  }
  useEffect(() => { load().catch((err) => setFlash(err.message)); }, []);

  async function save(event) {
    event.preventDefault();
    const body = { action: mode, ...Object.fromEntries(new FormData(event.currentTarget).entries()) };
    await api('/api/admin/users', { method: 'POST', body: JSON.stringify(body) });
    setFlash(mode === 'create' ? 'User created.' : 'User updated.');
    await load();
  }

  async function toggle(id) {
    if (!confirm("Toggle this user's status?")) return;
    await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'toggle', user_id: id }) });
    setFlash('User status updated.');
    await load();
  }

  return (
    <div className="panel">
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      <div className="d-flex flex-column flex-sm-row flex-wrap justify-content-between align-items-stretch align-items-sm-center gap-2 mb-3">
        <div className="panel-title mb-0">Accounts</div>
        <div className="d-flex flex-column flex-sm-row gap-2">
          <select className="form-select toolbar-select" value={role} onChange={(e) => { setRole(e.target.value); load(e.target.value); }}>
            {['All', 'Admin', 'Registrar', 'Freshman', 'Transferee', 'Graduating'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#userModal" onClick={() => { setMode('create'); setEdit({}); }}>
            <i className="bi bi-person-plus" /> Add user
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Status</th><th /></tr></thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.user_id}>
                <td>{row.first_name} {row.last_name}{row.student_number ? <div className="small text-muted">{row.student_number}</div> : null}</td>
                <td>{row.username}</td>
                <td>{row.role}</td>
                <td>{row.email}</td>
                <td><StatusBadge status={row.status} /></td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary me-1" data-bs-toggle="modal" data-bs-target="#userModal" onClick={() => { setMode('update'); setEdit(row); }}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => toggle(row.user_id)}>Toggle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal fade" id="userModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
          <form className="modal-content" onSubmit={save} key={`${mode}-${edit?.user_id || 'new'}`}>
            <input type="hidden" name="user_id" value={edit?.user_id || ''} />
            <div className="modal-header">
              <h5 className="modal-title">{mode === 'create' ? 'Add user' : 'Edit user'}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4"><label className="form-label">First name</label><input name="first_name" className="form-control" defaultValue={edit?.first_name || ''} required /></div>
                <div className="col-md-4"><label className="form-label">Middle name</label><input name="middle_name" className="form-control" defaultValue={edit?.middle_name || ''} /></div>
                <div className="col-md-4"><label className="form-label">Last name</label><input name="last_name" className="form-control" defaultValue={edit?.last_name || ''} required /></div>
                <div className="col-md-6"><label className="form-label">Student Number</label><input name="student_number" className="form-control" defaultValue={edit?.student_number || ''} /></div>
                <div className="col-md-6">
                  <label className="form-label">Role</label>
                  <select name="role" className="form-select" defaultValue={edit?.role || 'Freshman'}>
                    {['Admin', 'Registrar', 'Freshman', 'Transferee', 'Graduating'].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-md-6"><label className="form-label">Email</label><input type="email" name="email" className="form-control" defaultValue={edit?.email || ''} required /></div>
                <div className="col-md-6"><label className="form-label">Username</label><input name="username" className="form-control" defaultValue={edit?.username || ''} required /></div>
                <div className="col-md-6">
                  <label className="form-label">Password</label>
                  <input type="password" name="password" className="form-control" minLength={mode === 'create' ? 8 : undefined} required={mode === 'create'} />
                  <div className="form-text">{mode === 'create' ? 'Required for new users.' : 'Leave blank to keep current password.'}</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select name="status" className="form-select" defaultValue={edit?.status || 'Active'}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-primary">Save</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
