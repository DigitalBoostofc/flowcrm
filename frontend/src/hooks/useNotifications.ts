import { useEffect } from 'react';
import { useWs } from './useWebSocket';
import { useToastStore } from '@/store/toast.store';
import { useQualificationStore } from '@/store/qualification.store';
import type { Message, Lead, Contact } from '@/types/api';

export function useNotifications() {
  const { socket } = useWs();
  const pushToast = useToastStore((s) => s.push);
  const pushQualification = useQualificationStore((s) => s.push);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (evt: { message: Message; lead: Lead & { contact?: Contact }; isNewLead?: boolean }) => {
      const contactName = evt.lead.contact?.name ?? 'Nova mensagem';
      const body = evt.message.body.slice(0, 120);

      // Novo contato via WhatsApp → abre modal de qualificação
      if (evt.isNewLead) {
        pushQualification({ lead: evt.lead, message: evt.message });
        return;
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification(contactName, { body, tag: `flowcrm-lead-${evt.lead.id}` });
        } catch { /* noop */ }
      }

      pushToast({ title: contactName, body, leadId: evt.lead.id });
    };

    socket.on('message.received', handler);
    return () => { socket.off('message.received', handler); };
  }, [socket, pushToast, pushQualification]);
}
