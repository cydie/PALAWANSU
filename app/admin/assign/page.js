'use client';

import { useCallback, useMemo, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';

function appliesTo(type, role) {
  const raw = String(type?.applies_to || 'All');
  if (!raw || raw === 'All') return true;
  return raw.split(',').map((s) => s.trim()).includes(role);
}

export default function AssignPage() {
  const [data, setData] = useState({ students: [], types: [], assigned: [] });
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [mode, setMode] = useState('single');
  const [bulkCategory, setBulkCategory] = useState('Freshman');
  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const next = await api('/api/admin/assign');
    setData({
      students: next.students || [],
      types: next.types || [],
      assigned: next.assigned || [],
    });
  }, []);

  useLiveReload(load, { intervalMs: 3000 });

  const selectedStudent = useMemo(
    () => data.students.find((s) => String(s.user_id) === String(studentId)),
    [data.students, studentId]
  );

  const filteredTypes = useMemo(() => {
    if (mode === 'bulk') {
      return data.types.filter((t) => appliesTo(t, bulkCategory));
    }
    if (!selectedStudent) return data.types;
    return data.types.filter((t) => appliesTo(t, selectedStudent.role));
  }, [data.types, selectedStudent, mode, bulkCategory]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setFlash('');
    setSubmitting(true);
    const form = new FormData(event.target);
    try {
      const payload =
        mode === 'bulk'
          ? {
              action: 'bulk',
              category: form.get('category'),
              deficiency_id: form.get('deficiency_id'),
              remarks: form.get('remarks'),
              notify: form.get('notify') === 'on',
            }
          : {
              action: 'assign',
              user_id: form.get('user_id'),
              deficiency_id: form.get('deficiency_id'),
              remarks: form.get('remarks'),
              notify: form.get('notify') === 'on',
            };
      const result = await api('/api/admin/assign', { method: 'POST', body: JSON.stringify(payload) });
      setFlash(result.message);
      // Remount form instead of .reset() — avoids null reset crashes after await.
      setFormKey((k) => k + 1);
      setStudentId('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelAssignment(id) {
    if (!confirm('Cancel this open deficiency assignment?')) return;
    try {
      const result = await api('/api/admin/assign', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel', student_deficiency_id: id }),
      });
      setFlash(result.message);
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
        <div className="col-lg-4">
          <div className="panel">
            <div className="panel-title mb-1">Assign documentary requirement</div>
            <p className="small text-muted mb-3">
              Assign Form 137, PSA, TOR, clearance, and other campus requirements to students.
            </p>
            <div className="btn-group w-100 mb-3" role="group">
              <button type="button" className={`btn btn-sm ${mode === 'single' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('single')}>
                Single student
              </button>
              <button type="button" className={`btn btn-sm ${mode === 'bulk' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('bulk')}>
                Bulk by category
              </button>
            </div>
            <form key={formKey} onSubmit={onSubmit}>
              {mode === 'single' ? (
                <div className="mb-3">
                  <label className="form-label">Student</label>
                  <select
                    name="user_id"
                    className="form-select"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Select…</option>
                    {data.students.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.last_name}, {s.first_name} ({s.role} · {s.student_number || 'n/a'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label">Student category</label>
                  <select
                    name="category"
                    className="form-select"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    required
                    disabled={submitting}
                  >
                    {['Freshman', 'Transferee', 'Graduating'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Deficiency type</label>
                <select name="deficiency_id" className="form-select" required defaultValue="" disabled={submitting}>
                  <option value="">Select…</option>
                  {filteredTypes.map((t) => (
                    <option key={t.deficiency_id} value={t.deficiency_id}>
                      {t.deficiency_name} · {t.required_document}
                    </option>
                  ))}
                </select>
                <div className="form-text">Only types that apply to the selected category are listed.</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Remarks</label>
                <textarea name="remarks" className="form-control" rows={3} placeholder="Optional instructions for the student" disabled={submitting} />
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" name="notify" id="notify" defaultChecked disabled={submitting} />
                <label className="form-check-label" htmlFor="notify">
                  Notify student (in-app + email if SMTP is ready)
                </label>
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                <i className="bi bi-clipboard-plus" />{' '}
                {submitting ? 'Assigning…' : mode === 'bulk' ? 'Bulk Assign' : 'Assign Deficiency'}
              </button>
            </form>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="panel">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <div className="panel-title mb-0">Recent assignments</div>
              <span className="small text-muted">Live · updates every few seconds</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Category</th>
                    <th>Deficiency</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assigned.map((a) => (
                    <tr key={a.student_deficiency_id}>
                      <td>
                        <div className="fw-semibold">{a.first_name} {a.last_name}</div>
                        <div className="small text-muted">{a.student_number || '—'}</div>
                      </td>
                      <td>{a.role}</td>
                      <td>{a.deficiency_name}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>{String(a.assigned_date).slice(0, 10)}</td>
                      <td className="text-end">
                        {['Pending', 'Under Review', 'Rejected'].includes(a.status) ? (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => cancelAssignment(a.student_deficiency_id)}>
                            Cancel
                          </button>
                        ) : (
                          <span className="small text-muted">Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data.assigned.length ? (
                    <tr><td colSpan={6} className="text-center text-muted">No assignments yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
