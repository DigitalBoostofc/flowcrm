import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types/api';

interface Props {
  children: ReactNode;
  requireRole?: UserRole;
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}
