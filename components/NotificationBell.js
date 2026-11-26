'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StatusBadge from '@/components/StatusBadge';
import { api } from '@/lib/client';
import { clearBootstrapOverlays } from '@/lib/bootstrap-ui';

function formatWhen(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function NotificationBell({
  area,
  unread = 0,
  notifications = [],
  onChanged,
  mobile = false,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 16 });
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => setMounted(true), []);

  function placePanel() {
    const bell = rootRef.current?.querySelector('.notif-bell');
    if (!bell) return;
    const rect = bell.getBoundingClientRect();
    const gap = 10;
    setCoords({
      top: Math.round(rect.bottom + gap),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
    });
  }

  useLayoutEffect(() => {
    if (!open) return undefined;
    placePanel();
    function onReposition() {
      placePanel();
    }
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocPointer(event) {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDocPointer);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocPointer);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  async function markRead(id, event) {
    event?.preventDefault();
    event?.stopPropagation();
    clearBootstrapOverlays();
    setLocalError('');
    setBusy(true);
    try {
      if (area === 'admin') {
        await api('/api/admin/notifications', {
          method: 'POST',
          body: JSON.stringify({ action: 'mark_read', notification_id: id }),
        });
      } else {
        await api('/api/student/notifications', {
          method: 'POST',
          body: JSON.stringify({ notification_id: id }),
        });
      }
      await onChanged?.();
    } catch (err) {
      setLocalError(err.message || 'Could not mark as read.');
    } finally {
      setBusy(false);
    }
  }

  async function markAll(event) {
    event?.preventDefault();
    event?.stopPropagation();
    clearBootstrapOverlays();
    setLocalError('');
    setBusy(true);
    try {
      if (area === 'admin') {
        const unreadItems = notifications.filter((n) => n.status === 'Unread');
        for (const item of unreadItems) {
          await api('/api/admin/notifications', {
            method: 'POST',
            body: JSON.stringify({ action: 'mark_read', notification_id: item.notification_id }),
          });
        }
      } else {
        await api('/api/student/notifications', {
          method: 'POST',
          body: JSON.stringify({ action: 'mark_all' }),
        });
      }
      await onChanged?.();
    } catch (err) {
      setLocalError(err.message || 'Could not mark all as read.');
    } finally {
      setBusy(false);
    }
  }

  const panel = open ? (
    <div
      ref={panelRef}
      className={`notif-panel${mobile ? ' is-mobile' : ''}`}
      role="dialog"
      aria-label="All notifications"
      style={{ top: coords.top, right: coords.right }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="notif-panel-head">
        <strong>Notifications</strong>
        {unread > 0 ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={markAll}>
            {busy ? 'Updating…' : 'Mark all read'}
          </button>
        ) : null}
      </div>
      {localError ? <div className="alert alert-danger py-2 mx-2 mt-2 mb-0">{localError}</div> : null}
      <div className="notif-panel-list">
        {!notifications.length ? (
          <div className="notif-empty">No notifications yet.</div>
        ) : (
          notifications.map((n) => {
            const registration = String(n.title || '').toLowerCase().includes('student registration');
            return (
              <div className={`notif-item${n.status === 'Unread' ? ' is-unread' : ''}`} key={n.notification_id}>
                <div className="d-flex justify-content-between gap-2 align-items-start">
                  <strong>{n.title}</strong>
                  <StatusBadge status={n.status} />
                </div>
                <div className="small text-muted">{n.notification_type} · {formatWhen(n.sent_at)}</div>
                <p className="mb-2 mt-1">{n.message}</p>
                <div className="d-flex flex-wrap gap-2">
                  {area === 'admin' && registration ? (
                    <Link
                      href="/admin/users?status=Pending"
                      className="btn btn-sm btn-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(false);
                        if (n.status === 'Unread') markRead(n.notification_id, event);
                      }}
                    >
                      Open Users
                    </Link>
                  ) : null}
                  {n.status === 'Unread' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={busy}
                      onClick={(event) => markRead(n.notification_id, event)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`notif-bell-wrap${mobile ? ' is-mobile' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="notif-bell"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          clearBootstrapOverlays();
          setOpen((v) => !v);
          setLocalError('');
        }}
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unread > 0 ? <span className="notif-count">{unread > 99 ? '99+' : unread}</span> : null}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
