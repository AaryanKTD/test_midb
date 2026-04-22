import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('mib_username') || 'User';

  function logout() {
    localStorage.removeItem('mib_token');
    localStorage.removeItem('mib_username');
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        MIDB — Stock Tracker
      </span>
      <div className="navbar-links">
        <a
          className={`nav-btn${location.pathname === '/' ? ' active' : ''}`}
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          Browse Data
        </a>
        <a
          className={`nav-btn${location.pathname === '/submit' ? ' active' : ''}`}
          onClick={() => navigate('/submit')}
          style={{ cursor: 'pointer', background: location.pathname === '/submit' ? 'rgba(255,255,255,0.3)' : '#16a34a', border: '1px solid rgba(255,255,255,0.4)' }}
        >
          + Submit Entry
        </a>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 4px' }}>
          {username}
        </span>
        <button className="nav-btn" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
