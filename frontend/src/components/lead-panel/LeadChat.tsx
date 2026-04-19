import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { listConversations } from '@/api/conversations';
import { listMessages } from '@/api/messages';
import { listChannels } from '@/api/channels';
import MessageComposer from './MessageComposer';
import ScheduledMessagesList from './ScheduledMessagesList';
import type { Message } from '@/types/api';

export default function LeadChat({ leadId }: { leadId: string }) {
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', leadId],
    queryFn: () => listConversations(leadId),
  });

  const conversation = conversations[0];

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id ?? 'none'],
    queryFn: () => listMessages(conversation!.id),
    enabled: !!conversation,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: listChannels,
  });

  const activeChannels = channels.filter((c) => c.active);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-sm p-4 text-center" style={{ color: 'var(--ink-3)' }}>
          Nenhuma conversa ainda.<br />
          {activeChannels.length > 0 && 'Envie a primeira mensagem para iniciar.'}
        </div>
      </div>
    );
  }

  const orderedMessages = [...messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--canvas)' }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {orderedMessages.map((m: Message) => {
          const outbound = m.direction === 'outbound';
          return (
            <div key={m.id} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={outbound
                  ? { background: 'var(--brand-500)', color: '#fff', borderBottomRightRadius: 4 }
                  : { background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', borderBottomLeftRadius: 4 }
                }
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div
                  className="text-[10px] mt-1"
                  style={outbound ? { color: 'rgba(255,255,255,0.7)', textAlign: 'right' } : { color: 'var(--ink-3)' }}
                >
                  {format(new Date(m.sentAt), 'dd/MM HH:mm')}
                </div>
              </div>
            </div>
          );
        })}
        {orderedMessages.length === 0 && (
          <div className="text-center text-sm py-10" style={{ color: 'var(--ink-3)' }}>Sem mensagens</div>
        )}
      </div>
      <ScheduledMessagesList conversationId={conversation.id} />
      <MessageComposer conversationId={conversation.id} channels={activeChannels} />
    </div>
  );
}
