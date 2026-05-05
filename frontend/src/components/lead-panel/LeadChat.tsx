import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Mic, FileText, Loader2, File, Video } from 'lucide-react';
import { listConversations } from '@/api/conversations';
import { listMessages, transcribeAudio } from '@/api/messages';
import { listChannels } from '@/api/channels';
import { channelMeta } from '@/lib/channels';
import MessageComposer from './MessageComposer';
import ScheduledMessagesList from './ScheduledMessagesList';
import ConversationSummaryButton from './ConversationSummary';
import type { Conversation, Message } from '@/types/api';

function MessageContent({ message, isOut }: { message: Message; isOut: boolean }) {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  async function handleTranscribe() {
    if (!message.mediaUrl || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(message.mediaUrl);
      setTranscript(text);
    } catch {
      setTranscript('Não foi possível transcrever o áudio.');
    } finally {
      setIsTranscribing(false);
    }
  }

  if (message.type === 'image') {
    return (
      <div>
        {message.mediaUrl
          ? <a href={message.mediaUrl} target="_blank" rel="noreferrer">
              <img src={message.mediaUrl} alt={message.mediaCaption ?? 'Imagem'} className="max-w-[220px] rounded-lg object-cover" style={{ maxHeight: 180 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </a>
          : <span className="text-sm opacity-60">Imagem</span>
        }
        {message.mediaCaption && <p className="text-sm mt-1">{message.mediaCaption}</p>}
      </div>
    );
  }

  if (message.type === 'video') {
    return (
      <div>
        {message.mediaUrl
          ? <video controls src={message.mediaUrl} className="max-w-[220px] rounded-lg" style={{ maxHeight: 180 }} />
          : <div className="flex items-center gap-2 opacity-60"><Video className="w-4 h-4" strokeWidth={1.75} /><span className="text-sm">Vídeo</span></div>
        }
        {message.mediaCaption && <p className="text-sm mt-1">{message.mediaCaption}</p>}
      </div>
    );
  }

  if (message.type === 'audio') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 py-1">
          <Mic className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
          {message.mediaUrl
            ? <audio controls src={message.mediaUrl} className="h-8" style={{ minWidth: 160 }} />
            : <span className="text-sm opacity-60">Áudio</span>
          }
          {!isOut && message.mediaUrl && (
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              title="Transcrever áudio"
              className="p-1 rounded-lg flex-shrink-0 disabled:opacity-50 transition-opacity hover:opacity-70"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
            >
              {isTranscribing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <FileText className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </div>
        {transcript && (
          <p className="text-xs italic leading-relaxed px-1" style={{ color: 'var(--ink-2)' }}>
            {transcript}
          </p>
        )}
      </div>
    );
  }

  if (message.type === 'document') {
    return (
      <a href={message.mediaUrl ?? '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80">
        <File className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        <div className="text-sm">
          <p className="font-medium leading-tight truncate max-w-[180px]">{message.mediaFileName ?? 'Documento'}</p>
          {message.mediaMimeType && <p className="text-xs opacity-60">{message.mediaMimeType}</p>}
        </div>
      </a>
    );
  }

  if (message.type === 'deleted') {
    return <em className="text-sm opacity-60">Mensagem apagada</em>;
  }

  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>;
}

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
                <MessageContent message={m} isOut={outbound} />
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
