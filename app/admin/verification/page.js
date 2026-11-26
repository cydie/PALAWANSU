'use client';

import { useCallback, useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import DocumentActions from '@/components/DocumentActions';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';
import { clearBootstrapOverlays } from '@/lib/bootstrap-ui';

export default function VerificationPage() {
  const [status, setStatus] = useState('Pending');
  const [docs, setDocs] = useState([]);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (next = status) => {
    const data = await api(`/api/admin/verification?status=${encodeURIComponent(next)}`);
    setDocs(data.documents || []);
  }, [status]);

  useEffect(() => {
    clearBootstrapOverlays();
  }, []);

  useLiveReload(load, { intervalMs: 3000, enabled: !busyId });

  async function review(documentId, action, remarksValue) {
    clearBootstrapOverlays();
    setError('');
    setFlash('');
    const remarks = String(remarksValue || '').trim();
    if (action === 'Rejected' && !remarks) {
      setFieldError((prev) => ({ ...prev, [documentId]: 'Enter remarks before rejecting.' }));
      setError('Remarks are required when rejecting a document.');
      return;
    }
    if (action === 'Rejected' && !window.confirm('Reject this document? The student will need to re-upload.')) {
      return;
    }
    setFieldError((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
    setBusyId(documentId);
    try {
      const result = await api('/api/admin/verification', {
        method: 'POST',
        body: JSON.stringify({
          document_id: documentId,
          review_remarks: remarks,
          review_action: action,
        }),
      });
      setFlash(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reopen(sdId) {
    clearBootstrapOverlays();
    const remarks = window.prompt('Reason for reopening this cleared deficiency:');
    if (!remarks || !remarks.trim()) return;
    try {
      const result = await api('/api/admin/verification', {
        method: 'POST',
        body: JSON.stringify({
          action: 'Reopen',
          student_deficiency_id: sdId,
          review_remarks: remarks.trim(),
        }),
      });
      setFlash(result.message);
      await load('All');
      setStatus('All');
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
          <div className="panel-title">Document verification</div>
          <div className="small text-muted">
            View student uploads, download or print a copy, then approve or reject each requirement.
          </div>
        </div>
        <div className="panel-toolbar-actions">
          <select
            className="form-select toolbar-select"
            style={{ width: 'auto', minWidth: 170 }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); load(e.target.value); }}
            aria-label="Filter by review status"
          >
            {['Pending', 'Under Review', 'Approved', 'Rejected', 'All'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {!docs.length ? (
        <div className="empty-state">No documents to review for this filter.</div>
      ) : (
        <div className="row g-3">
          {docs.map((d) => {
            const locked = d.review_status === 'Approved';
            const canAct = ['Pending', 'Under Review'].includes(d.review_status);
            const isImage = /\.(png|jpe?g)$/i.test(d.file_name || d.file_path || '');
            const isPdf = /\.pdf$/i.test(d.file_name || d.file_path || '');
            const previewSrc = `/api/files/${d.file_path}`;
            const remarksId = `review-remarks-${d.document_id}`;
            const busy = busyId === d.document_id;
            return (
              <div className="col-12 col-xl-6" key={d.document_id}>
                <div className="panel verify-card mb-0">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <div>
                      <strong>{d.first_name} {d.last_name}</strong>
                      <div className="small text-muted">{d.role} · {d.student_number}</div>
                    </div>
                    <div className="text-end">
                      <StatusBadge status={d.review_status} />
                      <div className="small text-muted mt-1">Deficiency: {d.def_status}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="fw-semibold">{d.deficiency_name}</div>
                    <div className="small text-muted">{d.required_document}</div>
                  </div>
                  <div className="small mb-2">
                    <div className="fw-semibold text-break">
                      <i className="bi bi-paperclip" /> {d.file_name}
                    </div>
                    <div className="text-muted mt-1">
                      Uploaded {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '—'}
                    </div>
                    {d.last_review ? (
                      <div className="text-muted mt-1">
                        Last review: {d.last_review.review_action} by {d.last_review.first_name} {d.last_review.last_name}
                        {d.last_review.review_remarks ? ` — ${d.last_review.review_remarks}` : ''}
                      </div>
                    ) : null}
                  </div>

                  {(isImage || isPdf) ? (
                    <div className="doc-preview mb-3">
                      {isImage ? (
                        <img src={previewSrc} alt={d.file_name || 'Uploaded document'} />
                      ) : (
                        <iframe title={d.file_name || 'PDF preview'} src={previewSrc} />
                      )}
                    </div>
                  ) : null}

                  <div className="mb-3">
                    <DocumentActions filePath={d.file_path} fileName={d.file_name} />
                  </div>

                  {canAct ? (
                    <div className="d-grid gap-2">
                      <label className="form-label mb-0" htmlFor={remarksId}>Review remarks</label>
                      <textarea
                        id={remarksId}
                        name="review_remarks"
                        className={`form-control${fieldError[d.document_id] ? ' is-invalid' : ''}`}
                        rows={2}
                        placeholder="Remarks (required for reject)"
                        defaultValue={d.remarks || ''}
                        disabled={busy}
                      />
                      {fieldError[d.document_id] ? (
                        <div className="invalid-feedback d-block">{fieldError[d.document_id]}</div>
                      ) : null}
                      <div className="review-actions">
                        <button
                          type="button"
                          className="btn btn-success"
                          disabled={busy}
                          onClick={() => review(d.document_id, 'Approved', document.getElementById(remarksId)?.value)}
                        >
                          {busy ? 'Saving…' : 'Approve / Clear'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          disabled={busy}
                          onClick={() => review(d.document_id, 'Under Review', document.getElementById(remarksId)?.value)}
                        >
                          Mark Reviewing
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          disabled={busy}
                          onClick={() => review(d.document_id, 'Rejected', document.getElementById(remarksId)?.value)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : locked && d.def_status === 'Completed' ? (
                    <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => reopen(d.student_deficiency_id)}>
                      Reopen deficiency
                    </button>
                  ) : (
                    <div className="small text-muted">No further action on this document.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
