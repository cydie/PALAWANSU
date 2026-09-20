'use client';

import Link from 'next/link';
import { useState } from 'react';
import PasswordField from '@/components/PasswordField';
import { api } from '@/lib/client';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login: form.get('login'),
          password: form.get('password'),
        }),
      });
      window.location.assign(data.redirect);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="container-fluid p-0">
        <div className="row g-0 auth-split">
          <div className="col-xl-6 auth-hero">
            <div className="eyebrow">Palawan State University · Rizal Campus</div>
            <h1>Student Deficiency Monitoring</h1>
            <p className="lead mb-0">
              Track, upload, and verify documentary requirements for freshman, transferee, and graduating students — on any device.
            </p>
            <ul className="auth-features d-none d-sm-grid">
              <li><i className="bi bi-phone" /><span>Works on phones, tablets, and desktops with a Bootstrap 5 layout.</span></li>
              <li><i className="bi bi-database" /><span>Records stored in PostgreSQL with a Next.js (React) app.</span></li>
              <li><i className="bi bi-shield-check" /><span>Secure logins, document upload, and registrar verification in one place.</span></li>
            </ul>
          </div>
          <div className="col-xl-6 auth-form-pane">
            <div className="auth-card">
              <h2>Sign in</h2>
              <p className="lead">Use your campus account to continue.</p>
              {error ? <div className="alert alert-danger">{error}</div> : null}
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="login">Username or Email</label>
                  <input id="login" name="login" className="form-control" required autoComplete="username" autoFocus />
                </div>
                <PasswordField id="password" name="password" label="Password" autoComplete="current-password" />
                <button type="submit" className="btn btn-primary w-100" disabled={busy}>
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <p className="mt-3 mb-0 text-center small text-muted">
                New student? <Link href="/register">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
