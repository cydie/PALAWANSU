'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';

function UploadForm() {
  const params = useSearchParams();
  const [options, setOptions] = useState([]);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const selected = params.get('sd') || '';

  useEffect(() => {
    api('/api/student/upload').then((d) => setOptions(d.options)).catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const data = await api('/api/student/upload', { method: 'POST', body: form });
      setFlash(data.message);
      event.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel mx-auto" style={{ maxWidth: 640 }}>
      <div className="panel-title">Submit requirement</div>
      {flash ? <div className="alert alert-success">{flash} <Link href="/student/submissions">View submissions</Link></div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!options.length ? (
        <div className="empty-state">You have no open deficiencies that need uploads. <Link href="/student/deficiencies">View all</Link></div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Deficiency</label>
            <select name="student_deficiency_id" className="form-select" required defaultValue={selected}>
              {options.map((o) => (
                <option key={o.student_deficiency_id} value={o.student_deficiency_id}>
                  {o.deficiency_name} — {o.required_document} [{o.status}]
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Document file (PDF, JPG, PNG · max 5 MB)</label>
            <input type="file" name="document" className="form-control" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" required />
          </div>
          <button className="btn btn-primary">Upload</button>
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
