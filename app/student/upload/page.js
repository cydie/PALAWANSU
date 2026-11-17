'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';

function UploadForm() {
  const params = useSearchParams();
  const [options, setOptions] = useState([]);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(params.get('sd') || '');
  const selected = params.get('sd') || '';

  useEffect(() => {
    api('/api/student/upload')
      .then((d) => {
        setOptions(d.options);
        if (!selected && d.options?.[0]) {
          setSelectedId(String(d.options[0].student_deficiency_id));
        } else if (selected) {
          setSelectedId(selected);
        }
      })
      .catch((err) => setError(err.message));
  }, [selected]);

  const current = useMemo(
    () => options.find((o) => String(o.student_deficiency_id) === String(selectedId)),
    [options, selectedId]
  );
  const isReplace = Boolean(current?.has_upload) || current?.status === 'Under Review' || current?.status === 'Rejected';

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setFlash('');
    const form = new FormData(event.currentTarget);
    try {
      const data = await api('/api/student/upload', { method: 'POST', body: form });
      setFlash(data.message);
      event.currentTarget.reset();
      const refreshed = await api('/api/student/upload');
      setOptions(refreshed.options);
      if (selectedId) setSelectedId(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel mx-auto" style={{ maxWidth: 640 }}>
      <div className="panel-title">{isReplace ? 'Re-upload document' : 'Submit requirement'}</div>
      <p className="text-muted small mb-3">
        Attached the wrong file? Choose the same deficiency and upload again — the new file replaces the previous one
        while it is still pending or under review.
      </p>
      {flash ? <div className="alert alert-success">{flash} <Link href="/student/submissions">View submissions</Link></div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!options.length ? (
        <div className="empty-state">You have no open deficiencies that need uploads. <Link href="/student/deficiencies">View all</Link></div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Deficiency</label>
            <select
              name="student_deficiency_id"
              className="form-select"
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {options.map((o) => (
                <option key={o.student_deficiency_id} value={o.student_deficiency_id}>
                  {o.deficiency_name} — {o.required_document} [{o.status}]
                  {o.has_upload ? ' · replace file' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">
              {isReplace ? 'New document file' : 'Document file'} (PDF, JPG, PNG · max 5 MB)
            </label>
            <input type="file" name="document" className="form-control" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" required />
          </div>
          <button className="btn btn-primary">{isReplace ? 'Replace file' : 'Upload'}</button>
        </form>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <UploadForm />
    </Suspense>
  );
}
