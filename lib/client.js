export async function api(path, options = {}) {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: isForm
      ? options.headers
      : { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

/** Safely clear a form after async submit (React nullifies event.currentTarget after await). */
export function resetForm(form) {
  if (!form || typeof form.reset !== 'function') return;
  try {
    form.reset();
  } catch {
    // Form may already be unmounted; ignore.
  }
}

export function homePath(role) {
  return ['Admin', 'Registrar'].includes(role) ? '/admin/dashboard' : '/student/dashboard';
}

export const STATUS_CLASS = {
  Pending: 'badge-pending',
  'Under Review': 'badge-review',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected',
  Completed: 'badge-completed',
  Active: 'badge-approved',
  Inactive: 'badge-rejected',
  Unread: 'badge-pending',
  Read: 'badge-completed',
};
