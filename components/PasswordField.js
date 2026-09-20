'use client';

import { useState } from 'react';

export default function PasswordField({ id, name, label, autoComplete, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          type={show ? 'text' : 'password'}
          id={id}
          name={name}
          className="form-control"
          required={required}
          autoComplete={autoComplete}
          minLength={name?.includes('password') ? 8 : undefined}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
        </button>
      </div>
    </div>
  );
}
