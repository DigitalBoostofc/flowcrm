import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';
import { usePrefsStore } from './prefs.store';

interface AuthState {
  token: string | null;
  user: User | null;
  adminToken: string | null;
  adminUser: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  startImpersonation: (token: string, user: User) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      adminToken: null,
      adminUser: null,
      setAuth: (token, user) => {
        set({ token, user });
        usePrefsStore.getState().load();
      },
      logout: () => {
        usePrefsStore.getState().reset();
        set({ token: null, user: null, adminToken: null, adminUser: null });
      },
      startImpersonation: (token, user) => {
        const { token: currentToken, user: currentUser } = get();
        set({ adminToken: currentToken, adminUser: currentUser, token, user });
      },
      stopImpersonation: () => {
        const { adminToken, adminUser } = get();
        set({ token: adminToken, user: adminUser, adminToken: null, adminUser: null });
      },
    }),
    { name: 'flowcrm-auth' },
  ),
);
