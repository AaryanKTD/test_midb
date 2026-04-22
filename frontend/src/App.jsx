import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar  from './components/Navbar';
import Login   from './pages/Login';
import Signup  from './pages/Signup';
import Submit  from './pages/Submit';
import Search  from './pages/Search';

function useAuth() {
  return !!localStorage.getItem('mib_token');
}

function PrivateRoute({ children }) {
  return useAuth() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  useLocation();
  const authed = useAuth();
  return (
    <>
      {authed && <Navbar />}
      <Routes>
        <Route path="/login"   element={authed ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup"  element={authed ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/"        element={<PrivateRoute><Search /></PrivateRoute>} />
        <Route path="/submit"  element={<PrivateRoute><Submit /></PrivateRoute>} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
