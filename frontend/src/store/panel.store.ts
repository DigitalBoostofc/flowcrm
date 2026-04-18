import { create } from 'zustand';

interface PanelState {
  selectedLeadId: string | null;
  isOpen: boolean;
  open: (id: string) => void;
  close: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  selectedLeadId: null,
  isOpen: false,
  open: (id) => set({ selectedLeadId: id, isOpen: true }),
  close: () => set({ isOpen: false }),
}));
