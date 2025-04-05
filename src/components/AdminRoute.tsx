import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userData } = useAuth();

  if (!currentUser || !userData || userData.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}