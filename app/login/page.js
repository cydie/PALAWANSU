'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import PasswordField from '@/components/PasswordField';
import { RizalLogo } from '@/components/BrandLogo';
import { api } from '@/lib/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pendingNote = searchParams.get('pending') === '1';

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
            <div className="auth-hero-brand">
              <RizalLogo size={72} />
              <div className="brand-copy">
                <strong>Palawan State University</strong>
                <span>Rizal Campus</span>
              </div>
            </div>
            <div className="eyebrow">Office of the Registrar</div>
            <h1>Student Deficiency Monitoring System</h1>
            <p className="lead mb-0">
              Monitor, submit, and clear documentary requirements for freshman, transferee, and graduating students.
            </p>
            <ul className="auth-features d-none d-sm-grid">
              <li><i className="bi bi-clipboard-check" /><span>Registrar assigns and tracks documentary deficiencies per student category.</span></li>
              <li><i className="bi bi-cloud-arrow-up" /><span>Students upload Form 137, PSA, TOR, clearance, and other required files.</span></li>
              <li><i className="bi bi-printer" /><span>Generate, print, and save official deficiency and completion reports.</span></li>
            </ul>
          </div>
          <div className="col-xl-6 auth-form-pane">
            <div className="auth-card">
              <h2>Sign in</h2>
              <p className="lead">Use your PSU Rizal campus account to continue.</p>
              {pendingNote ? (
                <div className="alert alert-info">
                  Registration received. Your account is <strong>Pending</strong> until Admin or Registrar activates it.
                </div>
              ) : null}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-page d-flex align-items-center justify-content-center p-4">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
