import { create } from 'zustand';
import type { Lead, Contact, Message } from '@/types/api';

export interface QualificationItem {
  id: string;
  lead: Lead & { contact?: Contact };
  message: Message;
}

interface QualificationStore {
  queue: QualificationItem[];
  push: (item: Omit<QualificationItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useQualificationStore = create<QualificationStore>((set) => ({
  queue: [],
  push: (item) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => {
      // Evita duplicatas do mesmo lead
      const already = s.queue.some((q) => q.lead.id === item.lead.id);
      if (already) return s;
      return { queue: [...s.queue, { ...item, id }] };
    });
  },
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
}));
