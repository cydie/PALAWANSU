'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function VerificationPage() {
  const [status, setStatus] = useState('Pending');
  const [docs, setDocs] = useState([]);
  const [flash, setFlash] = useState('');

  async function load(next = status) {
    const data = await api(`/api/admin/verification?status=${encodeURIComponent(next)}`);
    setDocs(data.documents);
  }
  useEffect(() => { load().catch((err) => setFlash(err.message)); }, []);

  async function review(form, action) {
    if (action === 'Rejected' && !confirm('Reject this document?')) return;
    const fd = new FormData(form);
    const result = await api('/api/admin/verification', {
      method: 'POST',
      body: JSON.stringify({
        document_id: fd.get('document_id'),
        review_remarks: fd.get('review_remarks'),
        review_action: action,
      }),
    });
    setFlash(result.message);
    await load();
  }

  return (
    <div className="panel">
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      <form className="row g-2 align-items-end mb-3" onSubmit={(e) => { e.preventDefault(); load(status); }}>
        <div className="col-12 col-sm-6 col-lg-4">
          <label className="form-label">Review status</label>
          <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value); }}>
            {['Pending', 'Under Review', 'Approved', 'Rejected', 'All'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </form>
      {!docs.length ? (
        <div className="empty-state">No documents to review for this filter.</div>
      ) : (
        <div className="row g-3">
          {docs.map((d) => (
            <div className="col-12 col-xl-6" key={d.document_id}>
              <div className="panel verify-card mb-0">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <div>
                    <strong>{d.first_name} {d.last_name}</strong>
                    <div className="small text-muted">{d.role} · {d.student_number}</div>
                  </div>
                  <StatusBadge status={d.review_status} />
                </div>
                <div className="mb-2">
                  {d.deficiency_name}
                  <div className="small text-muted">{d.required_document}</div>
                </div>
                <div className="small mb-3">
                  <a className="file-link" href={`/api/files/${d.file_path}`} target="_blank" rel="noreferrer">
                    <i className="bi bi-paperclip" /> {d.file_name}
                  </a>
                  <div className="text-muted mt-1">Uploaded {d.uploaded_at}</div>
                </div>
                <form className="d-grid gap-2" onSubmit={(e) => e.preventDefault()}>
                  <input type="hidden" name="document_id" value={d.document_id} />
                  <textarea name="review_remarks" className="form-control" rows={2} placeholder="Remarks" defaultValue={d.remarks || ''} />
                  <div className="btn-group review-actions">
                    <button type="button" className="btn btn-success" onClick={(e) => review(e.currentTarget.closest('form'), 'Approved')}>Approve</button>
                    <button type="button" className="btn btn-outline-primary" onClick={(e) => review(e.currentTarget.closest('form'), 'Under Review')}>Review</button>
                    <button type="button" className="btn btn-outline-danger" onClick={(e) => review(e.currentTarget.closest('form'), 'Rejected')}>Reject</button>
                  </div>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
