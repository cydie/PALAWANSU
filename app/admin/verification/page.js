'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import DocumentActions from '@/components/DocumentActions';
import { api } from '@/lib/client';

export default function VerificationPage() {
  const [status, setStatus] = useState('Pending');
  const [docs, setDocs] = useState([]);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  async function load(next = status) {
    const data = await api(`/api/admin/verification?status=${encodeURIComponent(next)}`);
    setDocs(data.documents);
  }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function review(form, action) {
    setError('');
    const fd = new FormData(form);
    const remarks = String(fd.get('review_remarks') || '').trim();
    if (action === 'Rejected' && !remarks) {
      setError('Remarks are required when rejecting a document.');
      return;
    }
    if (action === 'Rejected' && !confirm('Reject this document? The student will need to re-upload.')) return;
    try {
      const result = await api('/api/admin/verification', {
        method: 'POST',
        body: JSON.stringify({
          document_id: fd.get('document_id'),
          review_remarks: remarks,
          review_action: action,
        }),
      });
      setFlash(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reopen(sdId) {
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
                    <div className="text-muted mt-1">Uploaded {d.uploaded_at}</div>
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
                    <form className="d-grid gap-2" onSubmit={(e) => e.preventDefault()}>
                      <input type="hidden" name="document_id" value={d.document_id} />
                      <textarea
                        name="review_remarks"
                        className="form-control"
                        rows={2}
                        placeholder="Remarks (required for reject)"
                        defaultValue={d.remarks || ''}
                      />
                      <div className="btn-group review-actions">
                        <button type="button" className="btn btn-success" onClick={(e) => review(e.currentTarget.closest('form'), 'Approved')}>
                          Approve / Clear
                        </button>
                        <button type="button" className="btn btn-outline-primary" onClick={(e) => review(e.currentTarget.closest('form'), 'Under Review')}>
                          Mark Reviewing
                        </button>
                        <button type="button" className="btn btn-outline-danger" onClick={(e) => review(e.currentTarget.closest('form'), 'Rejected')}>
                          Reject
                        </button>
                      </div>
                    </form>
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
