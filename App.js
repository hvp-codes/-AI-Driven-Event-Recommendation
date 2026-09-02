import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EventDetail from './pages/EventDetail';
import Recommendations from './pages/Recommendations';
import CreateEvent from './pages/CreateEvent';
import Profile from './pages/Profile';

export default function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route
            path="/recommendations"
            element={<ProtectedRoute><Recommendations /></ProtectedRoute>}
          />
          <Route
            path="/create-event"
            element={<ProtectedRoute><CreateEvent /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />
        </Routes>
      </div>
    </ToastProvider>
  );
}
