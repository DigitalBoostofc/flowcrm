import { useEffect } from 'react';
import { me } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';

export function useRefreshUser() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!token) return;
    me()
      .then((fresh) => {
        if (!fresh) return;
        const changed =
          fresh.isPlatformAdmin !== user?.isPlatformAdmin ||
          fresh.role !== user?.role ||
          fresh.name !== user?.name ||
          fresh.email !== user?.email ||
          fresh.phone !== user?.phone ||
          fresh.avatarUrl !== user?.avatarUrl;
        if (changed) setAuth(token, fresh);
      })
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
}
