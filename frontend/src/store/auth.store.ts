import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';
import { usePrefsStore } from './prefs.store';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        set({ token, user });
        usePrefsStore.getState().load();
      },
      logout: () => {
        usePrefsStore.getState().reset();
        set({ token: null, user: null });
      },
    }),
    { name: 'flowcrm-auth' },
  ),
);
