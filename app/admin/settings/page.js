'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const EMPTY = {
  enabled: false,
  host: '',
  port: 587,
  encryption: 'tls',
  username: '',
  password: '',
  from_email: '',
  from_name: 'PSU Rizal · Office of the Registrar',
  reply_to: '',
  password_set: false,
};

export default function AdminSettingsPage() {
  const [smtp, setSmtp] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    const data = await api('/api/admin/settings');
    setSmtp({ ...EMPTY, ...data.smtp, password: '' });
    setReady(Boolean(data.ready));
    if (!testEmail && data.smtp?.from_email) setTestEmail(data.smtp.from_email);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function updateField(name, value) {
    setSmtp((prev) => ({ ...prev, [name]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy('save');
    setFlash('');
    setError('');
    try {
      const result = await api('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          enabled: smtp.enabled,
          host: smtp.host,
          port: Number(smtp.port) || 587,
          encryption: smtp.encryption,
          username: smtp.username,
          password: smtp.password,
          from_email: smtp.from_email,
          from_name: smtp.from_name,
          reply_to: smtp.reply_to,
        }),
      });
      setFlash(result.message);
      setSmtp({ ...EMPTY, ...result.smtp, password: '' });
      setReady(Boolean(result.ready));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function verify() {
    setBusy('verify');
    setFlash('');
    setError('');
    try {
      const result = await api('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'verify',
          host: smtp.host,
          port: Number(smtp.port) || 587,
          encryption: smtp.encryption,
          username: smtp.username,
          password: smtp.password,
        }),
      });
      setFlash(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function sendTest() {
    setBusy('test');
    setFlash('');
    setError('');
    try {
      const result = await api('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'test', test_email: testEmail }),
      });
      setFlash(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="row g-3">
      <div className="col-xl-8">
        <div className="panel">
          <div className="panel-toolbar">
            <div>
              <div className="panel-title mb-0">SMTP settings</div>
              <div className="small text-muted">
                Configure campus mail delivery for deficiency notices, verification results, and Email-channel notifications.
              </div>
            </div>
            <span className={`badge ${ready ? 'text-bg-success' : 'text-bg-secondary'}`}>
              {ready ? 'Ready to send' : 'Not ready'}
            </span>
          </div>

          {flash ? <div className="alert alert-success py-2">{flash}</div> : null}
          {error ? <div className="alert alert-danger py-2">{error}</div> : null}

          <form onSubmit={save} className="row g-3">
            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="smtpEnabled"
                  checked={Boolean(smtp.enabled)}
                  onChange={(e) => updateField('enabled', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="smtpEnabled">
                  Enable outbound email for this system
                </label>
              </div>
            </div>

            <div className="col-md-8">
              <label className="form-label">SMTP host</label>
              <input
                className="form-control"
                value={smtp.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="smtp.gmail.com / mail.psu.palawan.edu.ph"
                autoComplete="off"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Port</label>
              <input
                type="number"
                className="form-control"
                min={1}
                max={65535}
                value={smtp.port}
                onChange={(e) => updateField('port', e.target.value)}
              />
              <div className="form-text">587 (STARTTLS) or 465 (SSL) are typical.</div>
            </div>

            <div className="col-md-4">
              <label className="form-label">Encryption</label>
              <select
                className="form-select"
                value={smtp.encryption}
                onChange={(e) => updateField('encryption', e.target.value)}
              >
                <option value="tls">STARTTLS / TLS</option>
                <option value="ssl">SSL / TLS (implicit)</option>
                <option value="none">None (not recommended)</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">SMTP username</label>
              <input
                className="form-control"
                value={smtp.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="Usually the mailbox address"
                autoComplete="off"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">SMTP password</label>
              <input
                type="password"
                className="form-control"
                value={smtp.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={smtp.password_set ? '•••••••• (leave blank to keep)' : 'App password / mailbox password'}
                autoComplete="new-password"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">From email</label>
              <input
                type="email"
                className="form-control"
                value={smtp.from_email}
                onChange={(e) => updateField('from_email', e.target.value)}
                placeholder="registrar.rizal@psu.palawan.edu.ph"
                required={Boolean(smtp.enabled)}
              />
              <div className="form-text">Appears as the sender of deficiency and notice emails.</div>
            </div>
            <div className="col-md-6">
              <label className="form-label">From name</label>
              <input
                className="form-control"
                value={smtp.from_name}
                onChange={(e) => updateField('from_name', e.target.value)}
                placeholder="PSU Rizal · Office of the Registrar"
              />
            </div>

            <div className="col-12">
              <label className="form-label">Reply-To (optional)</label>
              <input
                type="email"
                className="form-control"
                value={smtp.reply_to}
                onChange={(e) => updateField('reply_to', e.target.value)}
                placeholder="Where student replies should go"
              />
            </div>

            <div className="col-12 d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={busy === 'save'}>
                <i className="bi bi-save" /> {busy === 'save' ? 'Saving…' : 'Save SMTP settings'}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={verify} disabled={busy === 'verify'}>
                <i className="bi bi-plug" /> {busy === 'verify' ? 'Checking…' : 'Test connection'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="col-xl-4">
        <div className="panel">
          <div className="panel-title">Send test email</div>
          <p className="small text-muted">
            Saves must succeed first. This sends a branded PSU Rizal Registrar test message using the stored SMTP settings.
          </p>
          <div className="mb-3">
            <label className="form-label">Recipient</label>
            <input
              type="email"
              className="form-control"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="admin.rizal@psu.palawan.edu.ph"
            />
          </div>
          <button type="button" className="btn btn-outline-primary w-100" onClick={sendTest} disabled={busy === 'test' || !ready}>
            <i className="bi bi-envelope-check" /> {busy === 'test' ? 'Sending…' : 'Send test email'}
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">Used by this system for</div>
          <ul className="mb-0 small text-muted ps-3">
            <li>Email notices when SMTP is enabled</li>
            <li>Deficiency and clearance reminders to student inboxes</li>
            <li>Document verification follow-up messages</li>
            <li>Branded campus “From” identity for the Registrar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
