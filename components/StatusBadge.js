import { STATUS_CLASS } from '@/lib/client';

const LABELS = {
  Completed: 'Cleared',
  Approved: 'Approved',
  Pending: 'Pending',
  'Under Review': 'Under Review',
  Rejected: 'Rejected',
  Active: 'Active',
  Inactive: 'Inactive',
  Unread: 'Unread',
  Read: 'Read',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_CLASS[status] || 'badge-pending';
  return <span className={`status-badge ${cls}`}>{LABELS[status] || status}</span>;
}
