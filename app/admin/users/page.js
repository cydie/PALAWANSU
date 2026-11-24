'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import ModalPortal from '@/components/ModalPortal';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';
import { hideModal, showModal } from '@/lib/bootstrap-ui';

const STUDENT_ROLES = ['Freshman', 'Transferee', 'Graduating'];
const ALL_ROLES = ['Admin', 'Registrar', ...STUDENT_ROLES];

function UsersPageInner() {
  const searchParams = useSearchParams();
  const initialStatus = ['Pending', 'Active', 'Inactive'].includes(searchParams.get('status') || '')
    ? searchParams.get('status')
    : 'All';
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState(initialStatus);
  const [users, setUsers] = useState([]);
  const [scope, setScope] = useState('all');
  const [allowedRoles, setAllowedRoles] = useState(ALL_ROLES);
  const [edit, setEdit] = useState(null);
  const [mode, setMode] = useState('create');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (nextRole = role, nextStatus = status) => {
    const params = new URLSearchParams({
      role: nextRole,
      status: nextStatus,
    });
    const data = await api(`/api/admin/users?${params}`);
    setUsers(data.users || []);
    setScope(data.scope || 'all');
    setAllowedRoles(data.allowedRoles || ALL_ROLES);
  }, [role, status]);

  useEffect(() => {
    const fromUrl = searchParams.get('status');
    if (['Pending', 'Active', 'Inactive'].includes(fromUrl || '')) {
      setStatus(fromUrl);
      setRole('All');
    }
  }, [searchParams]);

  useLiveReload(load, { intervalMs: 3000 });

  async function openModal(nextMode, row) {
    setMode(nextMode);
    setEdit(row || {});
    setError('');
    window.setTimeout(() => showModal('userModal'), 0);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      const body = { action: mode, ...Object.fromEntries(new FormData(event.target).entries()) };
      const result = await api('/api/admin/users', { method: 'POST', body: JSON.stringify(body) });
      setFlash(result.message || (mode === 'create' ? 'User created.' : 'User updated.'));
      await hideModal('userModal');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(id, nextStatus, previousStatus) {
    if (nextStatus === previousStatus) return;
    try {
      const result = await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'set_status', user_id: id, status: nextStatus }),
      });
      setFlash(result.message || `Status updated to ${nextStatus}.`);
      await load();
    } catch (err) {
      setFlash(err.message);
      await load();
    }
  }

  const roleOptions = scope === 'students' ? STUDENT_ROLES : ALL_ROLES;
  const filterOptions = ['All', ...roleOptions];
  const defaultCreateRole = roleOptions.includes('Freshman') ? 'Freshman' : roleOptions[0];

  return (
    <div className="panel">
      {flash ? <div className="alert alert-success py-2">{flash}</div> : null}
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      <div className="panel-toolbar">
        <div>
          <div className="panel-title">{scope === 'students' ? 'Student accounts' : 'User accounts'}</div>
          <div className="small text-muted">
            {scope === 'students'
              ? 'Registrar view: student accounts only, including Pending registrations'
              : 'Manage Admin, Registrar, and student logins — Pending registrations appear first'}
          </div>
        </div>
        <div className="panel-toolbar-actions">
          <select
            className="form-select toolbar-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={role}
            onChange={(e) => { setRole(e.target.value); load(e.target.value, status); }}
            aria-label="Filter by role"
          >
            {filterOptions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            className="form-select toolbar-select"
            style={{ width: 'auto', minWidth: 130 }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); load(role, e.target.value); }}
            aria-label="Filter by status"
          >
            {['All', 'Pending', 'Active', 'Inactive'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => openModal('create', {})}>
            <i className="bi bi-person-plus" aria-hidden="true" />
            <span>{scope === 'students' ? 'Add Student' : 'Add User'}</span>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!users.length ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">No accounts found for this filter.</td>
              </tr>
            ) : null}
            {users.map((row) => (
              <tr key={row.user_id} className={row.status === 'Pending' ? 'table-warning' : undefined}>
                <td>
                  <div className="fw-semibold">{row.first_name} {row.last_name}</div>
                  {row.student_number ? <div className="small text-muted">{row.student_number}</div> : null}
                </td>
                <td>{row.username}</td>
                <td><span className="small fw-semibold text-secondary">{row.role}</span></td>
                <td className="small">{row.email}</td>
                <td style={{ minWidth: 140 }}>
                  <select
                    className="form-select form-select-sm"
                    value={row.status}
                    aria-label={`Status for ${row.username}`}
                    onChange={(e) => changeStatus(row.user_id, e.target.value, row.status)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <div className="mt-1"><StatusBadge status={row.status} /></div>
                </td>
                <td className="text-end text-nowrap">
                  {row.status === 'Pending' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-success me-1"
                      onClick={() => changeStatus(row.user_id, 'Active', row.status)}
                    >
                      Approve
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => openModal('update', row)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalPortal>
        <div className="modal fade" id="userModal" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
            <form className="modal-content" onSubmit={save} key={`${mode}-${edit?.user_id || 'new'}`}>
              <input type="hidden" name="user_id" value={edit?.user_id || ''} />
              <div className="modal-header">
                <h5 className="modal-title">
                  {mode === 'create'
                    ? (scope === 'students' ? 'Add Student' : 'Add User')
                    : (scope === 'students' ? 'Edit Student' : 'Edit User')}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">First name</label>
                    <input name="first_name" className="form-control" defaultValue={edit?.first_name || ''} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Middle name</label>
                    <input name="middle_name" className="form-control" defaultValue={edit?.middle_name || ''} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Last name</label>
                    <input name="last_name" className="form-control" defaultValue={edit?.last_name || ''} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Student Number</label>
                    <input name="student_number" className="form-control" defaultValue={edit?.student_number || ''} placeholder="Required for students" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <select name="role" className="form-select" defaultValue={edit?.role || defaultCreateRole}>
                      {roleOptions.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" name="email" className="form-control" defaultValue={edit?.email || ''} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Username</label>
                    <input name="username" className="form-control" defaultValue={edit?.username || ''} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      minLength={mode === 'create' ? 8 : undefined}
                      required={mode === 'create'}
                    />
                    <div className="form-text">
                      {mode === 'create' ? 'Minimum 8 characters.' : 'Leave blank to keep the current password.'}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-select" defaultValue={edit?.status || 'Active'}>
                      <option>Active</option>
                      <option>Pending</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="text-muted">Loading users…</div>}>
      <UsersPageInner />
    </Suspense>
  );
}
