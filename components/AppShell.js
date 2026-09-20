'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const NAV = {
  admin: [
    ['Dashboard', '/admin/dashboard', 'bi-speedometer2'],
    ['Students', '/admin/students', 'bi-people'],
    ['Deficiency Types', '/admin/deficiency-types', 'bi-journal-text'],
    ['Assign Deficiencies', '/admin/assign', 'bi-clipboard-plus'],
    ['Verification', '/admin/verification', 'bi-check2-square'],
    ['Notifications', '/admin/notifications', 'bi-bell'],
    ['Reports', '/admin/reports', 'bi-bar-chart-line'],
    ['Users', '/admin/users', 'bi-person-gear'],
    ['System Logs', '/admin/logs', 'bi-clock-history'],
  ],
  student: [
    ['Dashboard', '/student/dashboard', 'bi-house-door'],
    ['My Deficiencies', '/student/deficiencies', 'bi-exclamation-circle'],
    ['Upload Documents', '/student/upload', 'bi-cloud-arrow-up'],
    ['Submissions', '/student/submissions', 'bi-folder2-open'],
    ['Notifications', '/student/notifications', 'bi-bell'],
    ['Profile', '/student/profile', 'bi-person-circle'],
  ],
};

const TITLES = Object.fromEntries(
  [...NAV.admin, ...NAV.student].map(([label, href]) => [href, label])
);

function SidebarBody({ area, me, onLogout, pathname }) {
  const initials = `${me?.first_name?.[0] || ''}${me?.last_name?.[0] || ''}`.toUpperCase();
  return (
    <>
      <div className="brand-block">
        <div className="brand-mark">PSU</div>
        <div>
          <div className="brand-name">PALAWANSU</div>
          <div className="brand-sub">Rizal Campus</div>
        </div>
      </div>
      <nav className="side-nav" aria-label="Main">
        {NAV[area].map(([label, href, icon]) => (
          <Link key={href} href={href} className={`nav-link${pathname === href ? ' active' : ''}`}>
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

export default function AppShell({ area, children, initialUser = null, initialUnread = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState(initialUser);
  const [unread, setUnread] = useState(initialUnread);
  const title = TITLES[pathname] || 'PALAWANSU';
  const notifPath = area === 'admin' ? '/admin/notifications' : '/student/notifications';

  useEffect(() => {
    if (initialUser) {
      setMe(initialUser);
      setUnread(initialUnread);
      return;
    }
    let cancelled = false;
    api('/api/auth/me')
      .then((data) => {
        if (cancelled) return;
        setMe(data.user);
        setUnread(data.unread || 0);
      })
      .catch(() => {
        if (!cancelled) router.push('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [initialUser, initialUnread, router]);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
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
          <span className="brand-mark">PSU</span>
          <span className="brand-name">PALAWANSU</span>
        </div>
        <Link className="notif-bell" href={notifPath} aria-label="Notifications">
          <i className="bi bi-bell" />
          {unread > 0 ? <span className="notif-count">{unread}</span> : null}
        </Link>
      </header>

      <div className="offcanvas offcanvas-start sidebar d-lg-none" tabIndex={-1} id="appSidebar">
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5 mb-0">Menu</h2>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close menu" />
        </div>
        <div className="offcanvas-body sidebar-inner">
          <SidebarBody area={area} me={me} onLogout={logout} pathname={pathname} />
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
              <p className="page-sub mb-0">Palawan State University – Rizal Campus</p>
            </div>
            <div className="topbar-actions d-none d-lg-flex">
              <Link className="notif-bell" href={notifPath} aria-label="Notifications">
                <i className="bi bi-bell" />
                {unread > 0 ? <span className="notif-count">{unread}</span> : null}
              </Link>
            </div>
          </header>
          <main className="content-area">{children}</main>
          <footer className="app-footer">
            © {new Date().getFullYear()} Palawan State University – Rizal Campus · Student Deficiency Monitoring System
          </footer>
        </div>
      </div>
    </div>
  );
}
