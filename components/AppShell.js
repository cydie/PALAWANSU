'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { RizalLogo } from '@/components/BrandLogo';
import NotificationBell from '@/components/NotificationBell';
import { clearBootstrapOverlays, hideOffcanvas } from '@/lib/bootstrap-ui';

const NAV = {
  admin: [
    ['Dashboard', '/admin/dashboard', 'bi-speedometer2'],
    ['Students', '/admin/students', 'bi-people'],
    ['Deficiency Types', '/admin/deficiency-types', 'bi-journal-text'],
    ['Assign Deficiencies', '/admin/assign', 'bi-clipboard-plus'],
    ['Verification', '/admin/verification', 'bi-check2-square'],
    ['Inbox', '/admin/notifications', 'bi-send'],
    ['Reports', '/admin/reports', 'bi-bar-chart-line'],
    ['Users', '/admin/users', 'bi-person-gear'],
    ['Settings', '/admin/settings', 'bi-gear', 'Admin'],
    ['System Logs', '/admin/logs', 'bi-clock-history', 'Admin'],
  ],
  student: [
    ['Dashboard', '/student/dashboard', 'bi-house-door'],
    ['My Deficiencies', '/student/deficiencies', 'bi-exclamation-circle'],
    ['Upload Documents', '/student/upload', 'bi-cloud-arrow-up'],
    ['Submissions', '/student/submissions', 'bi-folder2-open'],
    ['Profile', '/student/profile', 'bi-person-circle'],
  ],
};

const TITLES = {
  ...Object.fromEntries([...NAV.admin, ...NAV.student].map(([label, href]) => [href, label])),
  '/admin/notifications': 'Inbox',
};

function SidebarBody({ area, me, onLogout, pathname, onNavigate }) {
  const initials = `${me?.first_name?.[0] || ''}${me?.last_name?.[0] || ''}`.toUpperCase();
  const links = NAV[area].filter((item) => !item[3] || item[3] === me?.role);
  return (
    <>
      <div className="brand-block">
        <RizalLogo size={48} />
        <div>
          <div className="brand-name">PSU Rizal</div>
          <div className="brand-sub">Student Deficiency Monitoring</div>
        </div>
      </div>
      <nav className="side-nav" aria-label="Main">
        {links.map(([label, href, icon]) => (
          <Link
            key={href}
            href={href}
            className={`nav-link${pathname === href ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <i className={`bi ${icon}`} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="user-avatar">{initials || 'U'}</div>
          <div className="user-meta">
            <strong>{me?.name}</strong>
            <span>{me?.role}</span>
          </div>
        </div>
        <button type="button" className="btn btn-logout w-100" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" /> Logout
        </button>
      </div>
    </>
  );
}

export default function AppShell({ area, children, initialUser = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState(initialUser);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const seenIds = useRef(new Set());
  const title = TITLES[pathname] || 'PSU Rizal';
  const usersPath = '/admin/users';

  const refreshNotifications = useCallback(async () => {
    const data = await api('/api/auth/me');
    setMe(data.user);
    setUnread(data.unread || 0);
    setNotifications(data.notifications || []);
    return data;
  }, []);

  useEffect(() => {
    clearBootstrapOverlays();
    hideOffcanvas('appSidebar');
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    refreshNotifications()
      .catch(() => {
        if (!cancelled) router.push('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [initialUser, router, refreshNotifications]);

  // Near real-time notification updates for everyone
  useEffect(() => {
    if (!me) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const data = await refreshNotifications();
        if (cancelled) return;
        const latest = data.latest || [];
        for (const note of latest) {
          const id = Number(note.notification_id);
          if (!id || seenIds.current.has(id)) continue;
          seenIds.current.add(id);
          setToast({
            id,
            title: note.title,
            message: note.message,
            registration: String(note.title || '').toLowerCase().includes('student registration'),
          });
          break;
        }
      } catch {
        // ignore transient poll errors
      }
    }

    const timer = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [me, refreshNotifications]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  function closeMobileMenu() {
    hideOffcanvas('appSidebar');
  }

  if (!me) {
    return (
      <div className="app-body d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-body">
      <header className="app-mobile-bar d-lg-none">
        <button className="btn btn-icon" type="button" data-bs-toggle="offcanvas" data-bs-target="#appSidebar" aria-label="Open menu">
          <i className="bi bi-list" />
        </button>
        <div className="mobile-brand">
          <RizalLogo size={34} />
          <span className="brand-name">PSU Rizal</span>
        </div>
        <NotificationBell
          area={area}
          unread={unread}
          notifications={notifications}
          onChanged={refreshNotifications}
          mobile
        />
      </header>

      <div className="offcanvas offcanvas-start sidebar d-lg-none" tabIndex={-1} id="appSidebar">
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5 mb-0">Menu</h2>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close menu" />
        </div>
        <div className="offcanvas-body sidebar-inner">
          <SidebarBody area={area} me={me} onLogout={logout} pathname={pathname} onNavigate={closeMobileMenu} />
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar desktop-sidebar d-none d-lg-flex">
          <div className="sidebar-inner">
            <SidebarBody area={area} me={me} onLogout={logout} pathname={pathname} />
          </div>
        </aside>
        <div className="main-panel">
          <header className="topbar">
            <div className="topbar-copy">
              <h1 className="page-title">{title}</h1>
              <p className="page-sub mb-0">Palawan State University – Rizal Campus · Office of the Registrar</p>
            </div>
            <div className="topbar-actions d-none d-lg-flex">
              <NotificationBell
                area={area}
                unread={unread}
                notifications={notifications}
                onChanged={refreshNotifications}
              />
            </div>
          </header>
          <main className="content-area">{children}</main>
          <footer className="app-footer">
            © {new Date().getFullYear()} Palawan State University – Rizal Campus · Student Deficiency Monitoring System
          </footer>
        </div>
      </div>

      {toast ? (
        <div className="live-toast" role="status" aria-live="polite">
          <div className="live-toast-title">
            <i className="bi bi-bell-fill" aria-hidden="true" />
            {toast.title}
          </div>
          <div className="live-toast-body">{toast.message}</div>
          <div className="live-toast-actions">
            {area === 'admin' && toast.registration ? (
              <Link href={usersPath} className="btn btn-sm btn-light" onClick={() => setToast(null)}>
                Open Users
              </Link>
            ) : null}
            <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setToast(null)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
