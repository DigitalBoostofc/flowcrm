import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
      openMobile: () => set({ mobileOpen: true }),
      closeMobile: () => set({ mobileOpen: false }),
    }),
    { name: 'flowcrm-sidebar', partialize: (s) => ({ collapsed: s.collapsed }) },
  ),
);
