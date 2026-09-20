'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setUser((await api('/api/student/profile')).user);
  }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const data = await api('/api/student/profile', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
      });
      setFlash(data.message);
      setError('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    try {
      const data = await api('/api/student/profile', {
        method: 'POST',
        body: JSON.stringify({ action: 'password', ...Object.fromEntries(new FormData(event.currentTarget).entries()) }),
      });
      setFlash(data.message);
      setError('');
      event.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePhoto(event) {
    event.preventDefault();
    try {
      const data = await api('/api/student/profile', { method: 'POST', body: new FormData(event.currentTarget) });
      setFlash(data.message);
      setError('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) return <div className="text-muted">Loading profile…</div>;
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

  return (
    <>
      {flash ? <div className="alert alert-success">{flash}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="panel text-center">
            {user.profile_image ? (
              <img src={`/api/files/${user.profile_image}`} alt="Profile" className="rounded-circle mb-3" width={120} height={120} style={{ width: 120, height: 120, objectFit: 'cover' }} />
            ) : (
              <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 120, height: 120, fontSize: '2rem', color: '#0b4f6c' }}>
                {initials}
              </div>
            )}
            <h5>{user.name}</h5>
            <div className="text-muted">{user.role} · {user.student_number}</div>
            <form onSubmit={savePhoto} className="mt-3">
              <input type="file" name="profile_image" className="form-control form-control-sm mb-2" accept="image/jpeg,image/png" required />
              <button className="btn btn-sm btn-outline-primary w-100">Upload photo</button>
            </form>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="panel">
            <div className="panel-title">Account details</div>
            <form className="row g-3" onSubmit={saveProfile}>
              <div className="col-md-4"><label className="form-label">First name</label><input name="first_name" className="form-control" defaultValue={user.first_name} required /></div>
              <div className="col-md-4"><label className="form-label">Middle name</label><input name="middle_name" className="form-control" defaultValue={user.middle_name || ''} /></div>
              <div className="col-md-4"><label className="form-label">Last name</label><input name="last_name" className="form-control" defaultValue={user.last_name} required /></div>
              <div className="col-md-6"><label className="form-label">Email</label><input type="email" name="email" className="form-control" defaultValue={user.email} required /></div>
              <div className="col-md-6"><label className="form-label">Username</label><input className="form-control" value={user.username} disabled /></div>
              <div className="col-12"><button className="btn btn-primary">Save profile</button></div>
            </form>
          </div>
          <div className="panel">
            <div className="panel-title">Change password</div>
            <form className="row g-3" onSubmit={savePassword}>
              <div className="col-md-4"><label className="form-label">Current</label><input type="password" name="current_password" className="form-control" required /></div>
              <div className="col-md-4"><label className="form-label">New</label><input type="password" name="new_password" className="form-control" minLength={8} required /></div>
              <div className="col-md-4"><label className="form-label">Confirm</label><input type="password" name="confirm_password" className="form-control" minLength={8} required /></div>
              <div className="col-12"><button className="btn btn-outline-primary">Update password</button></div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
