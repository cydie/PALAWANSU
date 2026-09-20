'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';

export default function SubmissionsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/api/student/submissions').then((d) => setRows(d.rows)).catch(() => {}); }, []);

  return (
    <div className="panel">
      <div className="panel-title">Upload history</div>
      {!rows.length ? (
        <div className="empty-state">No submissions yet. <Link href="/student/upload">Upload a document</Link>.</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead><tr><th>Deficiency</th><th>File</th><th>Uploaded</th><th>Doc status</th><th>Deficiency status</th><th>Remarks</th></tr></thead>
            <tbody>
              {rows.map((r) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
