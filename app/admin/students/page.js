'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import DocumentActions from '@/components/DocumentActions';
import ModalPortal from '@/components/ModalPortal';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';
import { hideModal, showModal } from '@/lib/bootstrap-ui';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [addFormKey, setAddFormKey] = useState(0);

  const load = useCallback(async (nextQ = q, nextCat = category) => {
    const params = new URLSearchParams({ q: nextQ, category: nextCat });
    const data = await api(`/api/admin/students?${params}`);
    setStudents(data.students || []);
  }, [q, category]);

  useLiveReload(load, { intervalMs: 4000 });

  function openAdd() {
    setFormError('');
    window.setTimeout(() => showModal('addStudent'), 0);
  }

  function openEdit(student) {
    setEdit(student);
    setFormError('');
    window.setTimeout(() => showModal('editStudent'), 0);
  }

  async function createStudent(event) {
    event.preventDefault();
    setFormError('');
    setError('');
    try {
      const form = new FormData(event.target);
      const result = await api('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', ...Object.fromEntries(form.entries()) }),
      });
      setFlash(result.message || 'Student added successfully.');
      setAddFormKey((k) => k + 1);
      await hideModal('addStudent');
      await load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setFormError('');
    setError('');
    try {
      const form = new FormData(event.target);
      const result = await api('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({ action: 'update', ...Object.fromEntries(form.entries()) }),
      });
      setFlash(result.message || 'Student updated.');
      await hideModal('editStudent');
      setEdit(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function openClearance(studentId) {
    setError('');
    try {
      const data = await api(`/api/admin/students?detail=${studentId}`);
      setDetail(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      {flash ? <div className="alert alert-success py-2">{flash}</div> : null}
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      <div className="panel-toolbar">
        <div>
          <div className="panel-title">Student records</div>
          <div className="small text-muted">Add students manually, search records, and check clearance</div>
        </div>
        <div className="panel-toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <i className="bi bi-person-plus" aria-hidden="true" />
            <span>Add Student</span>
          </button>
        </div>
      </div>
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
          <button className="btn btn-outline-primary w-100"><i className="bi bi-funnel" /> Filter</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Student</th>
              <th>Student Number</th>
              <th>Category</th>
              <th>Clearance</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!students.length ? <tr><td colSpan={6} className="text-center text-muted py-4">No students found.</td></tr> : null}
            {students.map((s) => {
              const open = Number(s.open_deficiencies || 0);
              const cleared = Number(s.cleared_deficiencies || 0);
              const total = Number(s.total_deficiencies || 0);
              const clearanceLabel =
                total === 0 ? 'No assignments' : open === 0 ? 'Cleared' : `${open} open / ${cleared} cleared`;
              return (
                <tr key={s.user_id} className={s.status === 'Pending' ? 'table-warning' : undefined}>
                  <td>
                    <div className="fw-semibold">{s.first_name} {s.last_name}</div>
                    <div className="small text-muted">{s.email}</div>
                  </td>
                  <td>{s.student_number || '—'}</td>
                  <td>{s.role}</td>
                  <td>
                    <span className={`small fw-semibold ${open === 0 && total > 0 ? 'text-success' : open > 0 ? 'text-danger' : 'text-muted'}`}>
                      {clearanceLabel}
                    </span>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => openClearance(s.user_id)}>
                      Clearance
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(s)}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="panel mt-3 mb-0">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div className="panel-title mb-0">
                {detail.student.first_name} {detail.student.last_name} · Clearance
              </div>
              <div className="small text-muted">
                {detail.student.role} · {detail.student.student_number} · {detail.clearance.status}
              </div>
            </div>
            <div className="d-flex gap-2">
              <Link className="btn btn-sm btn-primary" href="/admin/assign">Assign</Link>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
          {!detail.deficiencies.length ? (
            <div className="empty-state py-3">No deficiencies assigned yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>Document</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.deficiencies.map((d) => (
                    <tr key={d.student_deficiency_id}>
                      <td>{d.deficiency_name}</td>
                      <td className="small">{d.required_document}</td>
                      <td>{String(d.assigned_date).slice(0, 10)}</td>
                      <td>{d.completion_date ? String(d.completion_date).slice(0, 10) : '—'}</td>
                      <td><StatusBadge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel-title mt-4 mb-2">Uploaded documents</div>
          {!detail.uploads?.length ? (
            <div className="empty-state py-3">This student has not uploaded any files yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>File</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.uploads.map((u) => (
                    <tr key={u.document_id}>
                      <td>
                        {u.deficiency_name}
                        <div className="small text-muted">{u.required_document}</div>
                      </td>
                      <td className="small text-break">{u.file_name}</td>
                      <td className="small">{u.uploaded_at}</td>
                      <td><StatusBadge status={u.review_status} /></td>
                      <td>
                        <DocumentActions filePath={u.file_path} fileName={u.file_name} compact />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <ModalPortal>
        <div className="modal fade" id="addStudent" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
            <form className="modal-content" onSubmit={createStudent} key={addFormKey}>
              <div className="modal-header">
                <h5 className="modal-title">Add Student</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                {formError ? <div className="alert alert-danger py-2">{formError}</div> : null}
                <p className="small text-muted mb-3">
                  Admin and Registrar can create a student account manually. The student can then sign in with the username and password you set.
                </p>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">First name</label>
                    <input name="first_name" className="form-control" required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Middle name</label>
                    <input name="middle_name" className="form-control" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Last name</label>
                    <input name="last_name" className="form-control" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Student Number</label>
                    <input name="student_number" className="form-control" placeholder="e.g. 2026-0001" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Category</label>
                    <select name="role" className="form-select" defaultValue="Freshman">
                      <option>Freshman</option>
                      <option>Transferee</option>
                      <option>Graduating</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" name="email" className="form-control" placeholder="name@psu.palawan.edu.ph" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Username</label>
                    <input name="username" className="form-control" minLength={3} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Password</label>
                    <input type="password" name="password" className="form-control" minLength={8} required />
                    <div className="form-text">Minimum 8 characters.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-select" defaultValue="Active">
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
                  <i className="bi bi-person-plus" /> Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal>
        <div className="modal fade" id="editStudent" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
            <form className="modal-content" onSubmit={save} key={edit?.user_id || 'closed'}>
              <input type="hidden" name="user_id" value={edit?.user_id || ''} />
              <div className="modal-header">
                <h5 className="modal-title">Edit student</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body row g-3">
                {formError ? <div className="col-12"><div className="alert alert-danger py-2 mb-0">{formError}</div></div> : null}
                <div className="col-md-6"><label className="form-label">First name</label><input name="first_name" className="form-control" defaultValue={edit?.first_name || ''} required /></div>
                <div className="col-md-6"><label className="form-label">Last name</label><input name="last_name" className="form-control" defaultValue={edit?.last_name || ''} required /></div>
                <div className="col-12"><label className="form-label">Middle name</label><input name="middle_name" className="form-control" defaultValue={edit?.middle_name || ''} /></div>
                <div className="col-md-6"><label className="form-label">Student Number</label><input name="student_number" className="form-control" defaultValue={edit?.student_number || ''} required /></div>
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
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
