'use client';

import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';

function UploadForm() {
  const params = useSearchParams();
  const formRef = useRef(null);
  const [options, setOptions] = useState([]);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [selectedId, setSelectedId] = useState(params.get('sd') || '');
  const selected = params.get('sd') || '';

  const load = useCallback(async () => {
    const d = await api('/api/student/upload');
    setOptions(d.options || []);
    setSelectedId((prev) => {
      if (prev && (d.options || []).some((o) => String(o.student_deficiency_id) === String(prev))) {
        return String(prev);
      }
      if (selected && (d.options || []).some((o) => String(o.student_deficiency_id) === String(selected))) {
        return String(selected);
      }
      if (d.options?.[0]) return String(d.options[0].student_deficiency_id);
      return '';
    });
  }, [selected]);

  useLiveReload(load, { intervalMs: 3000, enabled: !submitting });

  const current = useMemo(
    () => options.find((o) => String(o.student_deficiency_id) === String(selectedId)),
    [options, selectedId]
  );
  const isReplace = Boolean(current?.has_upload) || current?.status === 'Under Review' || current?.status === 'Rejected';

  async function onSubmit(event) {
    event.preventDefault();
    const formEl = formRef.current || event.currentTarget;
    if (!formEl) {
      setError('Upload form is not ready. Please refresh and try again.');
      return;
    }
    setError('');
    setFlash('');
    setSubmitting(true);
    const form = new FormData(formEl);
    try {
      const data = await api('/api/student/upload', { method: 'POST', body: form });
      setFlash(data.message);
      const keepId = selectedId;
      // Remount file input instead of form.reset() — avoids null reset crashes.
      setFileKey((k) => k + 1);
      const refreshed = await api('/api/student/upload');
      setOptions(refreshed.options || []);
      if (keepId) setSelectedId(String(keepId));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
        <form ref={formRef} onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Deficiency</label>
            <select
              name="student_deficiency_id"
              className="form-select"
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={submitting}
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
            <input
              key={fileKey}
              type="file"
              name="document"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,image/*"
              required
              disabled={submitting}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Uploading…' : isReplace ? 'Replace file' : 'Upload'}
          </button>
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
