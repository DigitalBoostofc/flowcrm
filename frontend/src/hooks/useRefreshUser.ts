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
        if (fresh && (fresh.isPlatformAdmin !== user?.isPlatformAdmin || fresh.role !== user?.role)) {
          setAuth(token, fresh);
        }
      })
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
}
