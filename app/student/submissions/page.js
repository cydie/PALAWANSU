'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';
import { useLiveReload } from '@/lib/live';

export default function SubmissionsPage() {
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setRows((await api('/api/student/submissions')).rows || []);
  }, []);

  useLiveReload(load, { intervalMs: 3000 });

  return (
    <div className="panel">
      <div className="panel-title">Upload history</div>
      <p className="text-muted small mb-3">
        If you attached the wrong document, use <strong>Re-upload</strong> to send a new file. The previous pending file is replaced.
      </p>
      {!rows.length ? (
        <div className="empty-state">No submissions yet. <Link href="/student/upload">Upload a document</Link>.</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Deficiency</th>
                <th>File</th>
                <th>Uploaded</th>
                <th>Doc status</th>
                <th>Deficiency status</th>
                <th>Remarks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const canReupload = ['Pending', 'Rejected', 'Under Review'].includes(r.def_status);
                return (
                  <tr key={r.document_id}>
                    <td>
                      {r.deficiency_name}
                      <div className="small text-muted">{r.required_document}</div>
                    </td>
                    <td><a href={`/api/files/${r.file_path}`} target="_blank" rel="noreferrer">{r.file_name}</a></td>
                    <td>{r.uploaded_at}</td>
                    <td><StatusBadge status={r.review_status} /></td>
                    <td><StatusBadge status={r.def_status} /></td>
                    <td className="small">{r.remarks || '—'}</td>
                    <td>
                      {canReupload ? (
                        <Link className="btn btn-sm btn-outline-primary" href={`/student/upload?sd=${r.student_deficiency_id}`}>
                          Re-upload
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
