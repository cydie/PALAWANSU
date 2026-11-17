'use client';

function fileUrl(filePath, { download = false } = {}) {
  const base = `/api/files/${String(filePath || '').replace(/^\/+/, '')}`;
  return download ? `${base}?download=1` : base;
}

export function printDocument(filePath) {
  const url = fileUrl(filePath);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) return;
  const tryPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // browser may block; user can print from the opened tab
    }
  };
  // Images/PDF viewers often need a short delay before print is ready
  win.addEventListener('load', () => window.setTimeout(tryPrint, 400));
  window.setTimeout(tryPrint, 1200);
}

export default function DocumentActions({ filePath, fileName, compact = false }) {
  if (!filePath) return null;
  const viewHref = fileUrl(filePath);
  const downloadHref = fileUrl(filePath, { download: true });
  const btn = compact ? 'btn btn-sm' : 'btn btn-sm';

  return (
    <div className="doc-actions d-flex flex-wrap gap-2">
      <a className={`${btn} btn-outline-primary`} href={viewHref} target="_blank" rel="noreferrer">
        <i className="bi bi-eye" aria-hidden="true" /> View
      </a>
      <a className={`${btn} btn-outline-secondary`} href={downloadHref} download={fileName || true}>
        <i className="bi bi-download" aria-hidden="true" /> Download
      </a>
      <button type="button" className={`${btn} btn-outline-secondary`} onClick={() => printDocument(filePath)}>
        <i className="bi bi-printer" aria-hidden="true" /> Print
      </button>
    </div>
  );
}
