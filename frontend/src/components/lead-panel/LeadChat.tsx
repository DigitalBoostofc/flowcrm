import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { listConversations } from '@/api/conversations';
import { listMessages } from '@/api/messages';
import { listChannels } from '@/api/channels';
import { channelMeta } from '@/lib/channels';
import MessageComposer from './MessageComposer';
import ScheduledMessagesList from './ScheduledMessagesList';
import ConversationSummaryButton from './ConversationSummary';
import type { Conversation, Message } from '@/types/api';

export default function LeadChat({ leadId }: { leadId: string }) {
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', leadId],
    queryFn: () => listConversations(leadId),
  });

  const sortedConversations = [...conversations].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && sortedConversations[0]) {
      setSelectedId(sortedConversations[0].id);
    }
    if (selectedId && !sortedConversations.some((c) => c.id === selectedId) && sortedConversations[0]) {
      setSelectedId(sortedConversations[0].id);
    }
  }, [sortedConversations, selectedId]);

  const conversation = sortedConversations.find((c) => c.id === selectedId) ?? sortedConversations[0];

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
  }, [messages.length, conversation?.id]);

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
      {sortedConversations.length > 1 && (
        <ConversationTabs
          conversations={sortedConversations}
          selectedId={conversation.id}
          onSelect={setSelectedId}
        />
      )}
      <ConversationSummaryButton conversationId={conversation.id} />
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

function ConversationTabs({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="flex gap-1 px-2 py-2 overflow-x-auto flex-shrink-0"
      style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
    >
      {conversations.map((c) => {
        const meta = channelMeta(c.channelType);
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            title={c.externalId ? `${meta.label} · ${c.externalId}` : meta.label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors"
            style={
              active
                ? { background: meta.fg, color: '#fff', borderColor: meta.fg }
                : { background: meta.bg, color: meta.fg, borderColor: meta.border }
            }
          >
            <span>{meta.shortLabel}</span>
            {c.externalId && (
              <span className="font-mono opacity-80" style={{ fontSize: 10 }}>
                {formatExternalId(c.externalId)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function formatExternalId(raw: string): string {
  if (raw.length <= 6) return raw;
  return `…${raw.slice(-4)}`;
}
