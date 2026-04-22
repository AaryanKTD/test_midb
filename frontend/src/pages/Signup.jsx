import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function change(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/signup', {
        username: form.username,
        email:    form.email,
        password: form.password
      });
      localStorage.setItem('mib_token', res.data.token);
      localStorage.setItem('mib_username', res.data.username);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-title">Create Account</div>
        <div className="auth-sub">Join MIDB Stock Tracker</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={change}
              required
              minLength={3}
              placeholder="Choose a unique username"
              autoComplete="username"
              autoFocus
            />
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
              Min. 3 characters. Must be unique — this will appear on all your entries.
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={change}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={change}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={change}
              required
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account?{' '}
          <span className="auth-link" onClick={() => navigate('/login')}>Sign in</span>
        </p>
      </div>
    </div>
  );
}
