import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

export function useLogout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return () => {
    logout();
    qc.clear();
    navigate('/login', { replace: true });
  };
}
