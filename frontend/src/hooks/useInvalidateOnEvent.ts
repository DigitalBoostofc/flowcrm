import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWs } from './useWebSocket';
import type { Message, Lead } from '@/types/api';

export function useInvalidateOnEvent() {
  const queryClient = useQueryClient();
  const { socket } = useWs();

  useEffect(() => {
    if (!socket) return;

    const onMessageReceived = (evt: { message: Message; lead: Lead }) => {
      queryClient.setQueryData<Message[]>(
        ['messages', evt.message.conversationId],
        (old) => (old ? [evt.message, ...old] : [evt.message]),
      );
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    };

    const onLeadMoved = (_evt: { lead: Lead; newStageId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    };

    const onLeadCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    };

    const onLeadAssigned = () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    };

    const onChannelStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    };

    socket.on('message.received', onMessageReceived);
    socket.on('lead.moved', onLeadMoved);
    socket.on('lead.created', onLeadCreated);
    socket.on('lead.assigned', onLeadAssigned);
    socket.on('channel.status.changed', onChannelStatus);

    return () => {
      socket.off('message.received', onMessageReceived);
      socket.off('lead.moved', onLeadMoved);
      socket.off('lead.created', onLeadCreated);
      socket.off('lead.assigned', onLeadAssigned);
      socket.off('channel.status.changed', onChannelStatus);
    };
  }, [socket, queryClient]);
}
