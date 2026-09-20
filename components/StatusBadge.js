import { STATUS_CLASS } from '@/lib/client';

export default function StatusBadge({ status }) {
  const cls = STATUS_CLASS[status] || 'badge-pending';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}
