'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

const ROLES = ['Freshman', 'Transferee', 'Graduating'];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      router.push('/login');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="container-fluid p-0">
        <div className="row g-0 auth-split">
          <div className="col-xl-5 auth-hero">
            <div className="eyebrow">PalawanSU · Rizal</div>
            <h1>Create your student account</h1>
            <p className="lead mb-0">Register as a freshman, transferee, or graduating student to receive deficiency notices and upload required documents.</p>
          </div>
          <div className="col-xl-7 auth-form-pane">
            <div className="auth-card wide">
              <h2>Student registration</h2>
              <p className="lead">Fill in your campus details to finish signup.</p>
              {error ? <div className="alert alert-danger">{error}</div> : null}
              <form onSubmit={onSubmit}>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label">Student Number</label>
                    <input name="student_number" className="form-control" required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Category</label>
                    <select name="role" className="form-select" required defaultValue="">
                      <option value="">Select…</option>
                      {ROLES.map((role) => <option key={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label">First Name</label>
                    <input name="first_name" className="form-control" required />
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label">Middle Name</label>
                    <input name="middle_name" className="form-control" />
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label">Last Name</label>
                    <input name="last_name" className="form-control" required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Email</label>
                    <input type="email" name="email" className="form-control" required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Username</label>
                    <input name="username" className="form-control" required minLength={3} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Password</label>
                    <div className="password-wrap">
                      <input type={show ? 'text' : 'password'} name="password" className="form-control" required minLength={8} />
                      <button type="button" className="password-toggle" onClick={() => setShow((v) => !v)}>
                        <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label">Confirm Password</label>
                    <input type={show ? 'text' : 'password'} name="password_confirm" className="form-control" required minLength={8} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 mt-3" disabled={busy}>
                  <i className="bi bi-person-plus" /> {busy ? 'Saving…' : 'Register'}
                </button>
              </form>
              <p className="mt-3 mb-0 text-center small text-muted">
                Already registered? <Link href="/login">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
