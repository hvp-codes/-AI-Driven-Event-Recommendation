import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/login');
  };

  const linkClass = ({ isActive }) => (isActive ? 'active' : '');
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <nav className="navbar">
      <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
        <span className="brand-mark">E</span>
        <span className="brand-name">EventAI</span>
      </NavLink>

      <button className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
        {open ? '✕' : '☰'}
      </button>

      <div className={`nav-links ${open ? 'open' : ''}`}>
        <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Discover Events</NavLink>
        {user && <NavLink to="/recommendations" className={linkClass} onClick={() => setOpen(false)}>For You</NavLink>}
        {user && <NavLink to="/create-event" className={linkClass} onClick={() => setOpen(false)}>Host Event</NavLink>}
        {user && <NavLink to="/profile" className={linkClass} onClick={() => setOpen(false)}>Profile</NavLink>}
        {user ? (
          <button className="link-btn" onClick={handleLogout}>Logout</button>
        ) : (
          <>
            <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>Login</NavLink>
            <NavLink to="/register" className={linkClass} onClick={() => setOpen(false)}>Register</NavLink>
          </>
        )}
      </div>

      {user && (
        <div className="navbar-right">
          <div className="user-chip">
            <span className="avatar">{initial}</span>
            <span>{user.name}</span>
          </div>
        </div>
      )}
    </nav>
  );
}
