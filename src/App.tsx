import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import AdminPanel from '@/pages/AdminPanel';
import AlertManagement from '@/pages/AlertManagement';
import Profile from '@/pages/Profile';
import SOSPage from '@/pages/SOSPage';
import Bacheca from '@/pages/Bacheca';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bacheca"
              element={
                <ProtectedRoute>
                  <Bacheca />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sos"
              element={
                <ProtectedRoute>
                  <SOSPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/alerts"
              element={
                <AdminRoute>
                  <AlertManagement />
                </AdminRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;