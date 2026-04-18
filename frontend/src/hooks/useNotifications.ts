import { useEffect } from 'react';
import { useWs } from './useWebSocket';
import type { Message, Lead, Contact } from '@/types/api';

export function useNotifications() {
  const { socket } = useWs();

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (evt: { message: Message; lead: Lead & { contact?: Contact } }) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if (!document.hidden) return;
      try {
        new Notification(evt.lead.contact?.name ?? 'Nova mensagem', {
          body: evt.message.body.slice(0, 120),
          tag: `flowcrm-lead-${evt.lead.id}`,
        });
      } catch {
        // noop
      }
    };

    socket.on('message.received', handler);
    return () => {
      socket.off('message.received', handler);
    };
  }, [socket]);
}
