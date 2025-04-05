import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userData } = useAuth();

  if (!currentUser || !userData || userData.isBlocked) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}