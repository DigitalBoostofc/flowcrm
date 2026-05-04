import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, Send, Search, Phone, Loader2, Sparkles, Activity,
  FileText, Paperclip, Mic, File, Video, Trash2, SmilePlus, X,
  Check, CheckCheck,
} from 'lucide-react';
import ConversationSummaryButton from '@/components/lead-panel/ConversationSummary';
import LeadActivities from '@/components/lead-panel/LeadActivities';
import LeadInfo from '@/components/lead-panel/LeadInfo';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { listInbox, markConversationRead, qualifyConversation, type InboxItem, type InboxPage } from '@/api/conversations';
import { listMessages, sendMessage, sendMedia, reactMessage, deleteMessage } from '@/api/messages';
import { listQuickReplies } from '@/api/quick-replies';
import { listChannels } from '@/api/channels';
import { api } from '@/api/client';
import { useWs } from '@/hooks/useWebSocket';
import type { Message, QuickReply } from '@/types/api';
import Avatar from '@/components/ui/Avatar';
import { channelMeta, uniqueChannelTypes } from '@/lib/channels';

/* ── helpers ──────────────────────────────────────────── */

function timeAgo(iso: string | null) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: false });
  } catch { return ''; }
}

function getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* ── MessageBubble ────────────────────────────────────── */

function MessageBubble({ message, isOut, channelId, onDelete }: {
  message: Message;
  isOut: boolean;
  channelId: string;
  onDelete: (m: Message) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const reactMut = useMutation({
    mutationFn: (emoji: string) =>
      reactMessage({ messageId: message.externalMessageId ?? message.id, channelConfigId: channelId, emoji }),
  });

  const bubbleStyle = isOut
    ? { background: 'var(--brand-500)', color: '#fff', borderBottomRightRadius: 4 }
    : { background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', borderBottomLeftRadius: 4 };

  function renderContent() {
    if (message.type === 'deleted') {
      return <em className="text-sm opacity-60">Mensagem apagada</em>;
    }
    if (message.type === 'image' && message.mediaUrl) {
      return (
        <a href={message.mediaUrl} target="_blank" rel="noreferrer">
          <img
            src={message.mediaUrl}
            alt={message.mediaCaption ?? 'Imagem'}
            className="max-w-[240px] rounded-lg object-cover"
            style={{ maxHeight: 200 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {message.mediaCaption && <p className="text-sm mt-1 leading-relaxed">{message.mediaCaption}</p>}
        </a>
      );
    }
    if (message.type === 'video' && message.mediaUrl) {
      return (
        <div>
          <video controls src={message.mediaUrl} className="max-w-[240px] rounded-lg" style={{ maxHeight: 200 }} />
          {message.mediaCaption && <p className="text-sm mt-1">{message.mediaCaption}</p>}
        </div>
      );
    }
    if (message.type === 'audio' && message.mediaUrl) {
      return (
        <div className="flex items-center gap-2 py-1">
          <Mic className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
          <audio controls src={message.mediaUrl} className="h-8" style={{ minWidth: 160 }} />
        </div>
      );
    }
    if (message.type === 'document') {
      return (
        <a
          href={message.mediaUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 hover:opacity-80"
        >
          <File className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
          <div className="text-sm">
            <p className="font-medium leading-tight truncate max-w-[200px]">
              {message.mediaFileName ?? 'Documento'}
            </p>
            {message.mediaMimeType && (
              <p className="text-xs opacity-60">{message.mediaMimeType}</p>
            )}
          </div>
        </a>
      );
    }
    return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>;
  }

  function renderStatus() {
    if (!isOut) return null;
    const s = message.status;
    if (s === 'read') return <CheckCheck className="w-3 h-3" style={{ color: '#93c5fd' }} />;
    if (s === 'delivered') return <CheckCheck className="w-3 h-3 opacity-60" />;
    if (s === 'sent') return <Check className="w-3 h-3 opacity-60" />;
    return null;
  }

  return (
    <div
      className={`flex ${isOut ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojis(false); }}
    >
      <div className="relative max-w-[70%]">
        {/* Action bar */}
        {hovered && message.type !== 'deleted' && channelId && (
          <div
            className={`absolute top-0 flex items-center gap-1 z-10 ${isOut ? 'right-full mr-1' : 'left-full ml-1'}`}
          >
            {showEmojis ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl shadow-lg border"
                style={{ background: 'var(--surface)', borderColor: 'var(--edge)' }}>
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { reactMut.mutate(emoji); setShowEmojis(false); }}
                    className="text-base hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
                <button onClick={() => setShowEmojis(false)}>
                  <X className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowEmojis(true)}
                  title="Reagir"
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <SmilePlus className="w-3.5 h-3.5" style={{ color: 'var(--ink-2)' }} />
                </button>
                {isOut && (
                  <button
                    onClick={() => onDelete(message)}
                    title="Apagar"
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                    style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--danger, #ef4444)' }} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="px-3 py-2 rounded-2xl" style={bubbleStyle}>
          {renderContent()}
          <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : ''}`}>
            <p className={`text-[10px] ${isOut ? 'text-white/60' : ''}`} style={!isOut ? { color: 'var(--ink-3)' } : {}}>
              {new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {renderStatus()}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── QuickRepliesPopup ────────────────────────────────── */

function QuickRepliesPopup({ search, onSelect, onClose }: {
  search: string;
  onSelect: (qr: QuickReply) => void;
  onClose: () => void;
}) {
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['quick-replies', search],
    queryFn: () => listQuickReplies(search || undefined),
  });

  if (!isLoading && replies.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border shadow-xl overflow-hidden z-20"
      style={{ background: 'var(--surface)', borderColor: 'var(--edge)', maxHeight: 240 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--edge)' }}>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--ink-2)' }}>Respostas rápidas</span>
        <button onClick={onClose}><X className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} /></button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 190 }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--ink-3)' }} /></div>
        ) : replies.map(qr => (
          <button
            key={qr.id}
            onClick={() => onSelect(qr)}
            className="w-full text-left px-3 py-2.5 transition-colors hover:bg-opacity-50"
            style={{ borderBottom: '1px solid var(--edge)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
                /{qr.shortcut ?? qr.title.toLowerCase().replace(/\s+/g, '')}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>{qr.title}</span>
            </div>
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-3)' }}>{qr.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── MediaUploadPreview ───────────────────────────────── */

function MediaUploadPreview({ file, onCancel }: { file: File; onCancel: () => void }) {
  const isImage = file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border mb-2"
      style={{ background: 'var(--surface-hover)', borderColor: 'var(--edge)' }}>
      {isImage && previewUrl ? (
        <img src={previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-50)' }}>
          {file.type.startsWith('video/') ? <Video className="w-5 h-5" style={{ color: 'var(--brand-500)' }} /> :
           file.type.startsWith('audio/') ? <Mic className="w-5 h-5" style={{ color: 'var(--brand-500)' }} /> :
           <File className="w-5 h-5" style={{ color: 'var(--brand-500)' }} />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-1)' }}>{file.name}</p>
        <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{formatFileSize(file.size)}</p>
      </div>
      <button onClick={onCancel} className="p-1 rounded-lg hover:opacity-80"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        <X className="w-3.5 h-3.5" style={{ color: 'var(--ink-2)' }} />
      </button>
    </div>
  );
}

/* ── ConvItem ─────────────────────────────────────────── */

function ConvItem({ item, selected, onClick }: { item: InboxItem; selected: boolean; onClick: () => void }) {
  const pending = item.pendingClassification;
  const ch = channelMeta(item.channelType);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: selected ? 'var(--brand-50)' : 'transparent',
        borderBottom: '1px solid var(--edge)',
        borderLeft: selected ? '2px solid var(--brand-500)' : '2px solid transparent',
      }}
    >
      <Avatar name={item.contactName} url={item.contactAvatarUrl} size={36} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>
            {item.contactName ?? item.externalId ?? 'Desconhecido'}
          </span>
          <span className="text-[10px] flex-shrink-0 flex items-center gap-1.5" style={{ color: 'var(--ink-3)' }}>
            <span
              title={ch.label}
              className="px-1.5 py-0.5 rounded-full font-semibold border"
              style={{ background: ch.bg, color: ch.fg, borderColor: ch.border, fontSize: 9 }}
            >
              {ch.shortLabel}
            </span>
            {timeAgo(item.lastMessageSentAt ?? item.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.unread && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
          )}
          {pending && (
            <span
              className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
              Qualificar
            </span>
          )}
          <p className="text-xs truncate" style={{ color: item.unread ? 'var(--ink-2)' : 'var(--ink-3)', fontWeight: item.unread ? 500 : 400 }}>
            {item.lastMessageDirection === 'outbound' && <span style={{ color: 'var(--ink-3)' }}>Você: </span>}
            {item.lastMessageBody ?? 'Nenhuma mensagem'}
          </p>
        </div>
      </div>
    </button>
  );
}

/* ── ChatView ─────────────────────────────────────────── */

type ChatTab = 'chat' | 'activities' | 'info';

const CHAT_TABS: { id: ChatTab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'activities', label: 'Atividades', icon: Activity },
  { id: 'info', label: 'Dados', icon: FileText },
];

function ChatView({ item, onQualify }: { item: InboxItem; onQualify: (name: string) => Promise<void> }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [qualifyName, setQualifyName] = useState('');
  const [showQualifyForm, setShowQualifyForm] = useState(false);
  const [body, setBody] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { socket } = useWs();

  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });
  const activeChannels = channels.filter(c => c.active && c.status === 'connected');
  const [channelId, setChannelId] = useState('');

  useEffect(() => {
    if (!channelId && activeChannels.length) setChannelId(activeChannels[0].id);
  }, [activeChannels.length]);

  const { data: rawMessages = [], isLoading } = useQuery({
    queryKey: ['messages', item.id],
    queryFn: () => listMessages(item.id),
    enabled: activeTab === 'chat',
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const messages = [...rawMessages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  // Auto-scroll on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, activeTab]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['messages', item.id] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    };
    socket.on('message.received', handler);
    return () => { socket.off('message.received', handler); };
  }, [socket, item.id, qc]);

  // Reset tab on conversation switch
  useEffect(() => { setActiveTab('chat'); setBody(''); setSelectedFile(null); setShowQualifyForm(false); setQualifyName(''); }, [item.id]);

  // Mark as read on WhatsApp side when conversation opens
  useEffect(() => {
    if (channelId && item.externalId) {
      api.post(`/channels/${channelId}/mark-read`, { chatId: item.externalId }).catch(() => {});
    }
  }, [item.id, channelId]);

  // Send text mutation
  const sendMut = useMutation({
    mutationFn: () => sendMessage({ conversationId: item.id, channelConfigId: channelId, body: body.trim() }),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['messages', item.id] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  // Send media mutation
  const sendMediaMut = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return sendMedia({
        conversationId: item.id,
        channelConfigId: channelId,
        mediaType: getMediaType(file.type),
        base64,
        mediaMimeType: file.type,
        mediaFileName: file.name,
        mediaCaption: body.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSelectedFile(null);
      setBody('');
      qc.invalidateQueries({ queryKey: ['messages', item.id] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  // Delete message mutation
  const deleteMut = useMutation({
    mutationFn: (m: Message) =>
      deleteMessage(m.id, { messageId: m.externalMessageId ?? m.id, channelConfigId: channelId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', item.id] }),
  });

  const handleSend = useCallback(() => {
    if (selectedFile) {
      if (!channelId || sendMediaMut.isPending) return;
      sendMediaMut.mutate(selectedFile);
    } else {
      if (!body.trim() || !channelId || sendMut.isPending) return;
      sendMut.mutate();
    }
  }, [body, channelId, selectedFile, sendMut, sendMediaMut]);

  const handleBodyChange = useCallback((val: string) => {
    setBody(val);

    // Quick replies trigger
    if (val === '/') {
      setShowQuickReplies(true);
      setQuickReplySearch('');
    } else if (val.startsWith('/') && !val.includes(' ')) {
      setShowQuickReplies(true);
      setQuickReplySearch(val.slice(1));
    } else {
      setShowQuickReplies(false);
    }

    // Typing indicator (debounced 800ms)
    if (channelId && item.externalId && val.trim()) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        api.post(`/channels/${channelId}/typing`, { chatId: item.externalId }).catch(() => {});
      }, 800);
    }
  }, [channelId, item.externalId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleQuickReplySelect = useCallback((qr: QuickReply) => {
    setBody(qr.body);
    setShowQuickReplies(false);
  }, []);

  const phone = item.contactPhone ?? item.externalId;
  const isSending = sendMut.isPending || sendMediaMut.isPending;
  const canSend = (selectedFile || body.trim()) && channelId && !isSending && activeChannels.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        <Avatar name={item.contactName} url={item.contactAvatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
            {item.contactName ?? 'Desconhecido'}
          </div>
          {phone && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}>
              <Phone className="w-3 h-3" strokeWidth={1.75} />
              {phone}
            </div>
          )}
        </div>
        {item.pendingClassification ? (
          showQualifyForm ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={qualifyName}
                onChange={e => setQualifyName(e.target.value)}
                placeholder={item.externalId ?? 'Nome do contato'}
                className="text-xs rounded-lg px-2 py-1 outline-none w-36"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') onQualify(qualifyName).then(() => { setShowQualifyForm(false); setQualifyName(''); });
                  if (e.key === 'Escape') { setShowQualifyForm(false); setQualifyName(''); }
                }}
              />
              <button
                onClick={() => onQualify(qualifyName).then(() => { setShowQualifyForm(false); setQualifyName(''); })}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: 'var(--brand-500)', color: '#fff' }}
              >
                Salvar
              </button>
              <button onClick={() => { setShowQualifyForm(false); setQualifyName(''); }}>
                <X className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowQualifyForm(true)}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
              Qualificar
            </button>
          )
        ) : (
          <div
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: item.unread ? 'var(--success-bg)' : 'var(--surface-hover)',
              color: item.unread ? 'var(--success)' : 'var(--ink-3)',
            }}
          >
            {item.unread ? 'Nova mensagem' : 'WhatsApp'}
          </div>
        )}
      </div>

      {/* Tabs — only show Activities/Info when conversation is linked to a lead */}
      <div
        className="flex gap-1 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        {CHAT_TABS.filter(t => item.leadId || t.id === 'chat').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              activeTab === id
                ? { background: 'var(--panel-bg, var(--canvas))', color: 'var(--ink-1)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                : { color: 'var(--ink-3)' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'chat' && (
        <>
          <ConversationSummaryButton conversationId={item.id} />

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ background: 'var(--canvas)' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ink-3)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--ink-3)' }}>
                <MessageCircle className="w-8 h-8" strokeWidth={1.5} />
                <p className="text-sm">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map(m => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isOut={m.direction === 'outbound'}
                  channelId={channelId}
                  onDelete={(msg) => deleteMut.mutate(msg)}
                />
              ))
            )}
          </div>

          {/* Composer */}
          <div
            className="flex-shrink-0 px-4 py-3 space-y-2 relative"
            style={{ borderTop: '1px solid var(--edge)', background: 'var(--surface)' }}
          >
            {/* Quick replies popup */}
            {showQuickReplies && (
              <QuickRepliesPopup
                search={quickReplySearch}
                onSelect={handleQuickReplySelect}
                onClose={() => setShowQuickReplies(false)}
              />
            )}

            {activeChannels.length === 0 && (
              <p className="text-xs text-center" style={{ color: 'var(--warning)' }}>
                Nenhum canal WhatsApp conectado. Vá em Configurações → Canais.
              </p>
            )}

            {activeChannels.length > 1 && (
              <select
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
                className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
              >
                {activeChannels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {selectedFile && (
              <MediaUploadPreview file={selectedFile} onCancel={() => setSelectedFile(null)} />
            )}

            <div className="flex gap-2 items-end">
              {/* File picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={activeChannels.length === 0}
                title="Anexar arquivo"
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
              >
                <Paperclip className="w-4 h-4" strokeWidth={1.75} />
              </button>

              <textarea
                value={body}
                onChange={e => handleBodyChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={selectedFile ? 'Legenda (opcional)...' : 'Digite uma mensagem... (/ para respostas rápidas)'}
                rows={2}
                className="flex-1 text-sm rounded-xl px-3 py-2 resize-none outline-none"
                style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                disabled={activeChannels.length === 0}
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                className="w-10 h-10 rounded-xl flex items-center justify-center self-end disabled:opacity-40 transition-opacity flex-shrink-0"
                style={{ background: 'var(--brand-500)', color: '#fff' }}
              >
                {isSending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" strokeWidth={2} />
                }
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'activities' && item.leadId && (
        <div className="flex-1 overflow-auto">
          <LeadActivities leadId={item.leadId} />
        </div>
      )}

      {activeTab === 'info' && item.leadId && (
        <div className="flex-1 overflow-auto">
          <LeadInfo leadId={item.leadId} />
        </div>
      )}
    </div>
  );
}

/* ── Inbox Page ───────────────────────────────────────── */

export default function Inbox() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'todas' | 'pendentes'>('todas');
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { socket } = useWs();

  const PAGE_SIZE = 50;
  const inboxQuery = useInfiniteQuery({
    queryKey: ['inbox'],
    queryFn: ({ pageParam = 1 }) => listInbox({ page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.pageSize;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  const inbox: InboxItem[] = useMemo(
    () => inboxQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [inboxQuery.data],
  );
  const total = inboxQuery.data?.pages[0]?.total ?? 0;
  const isLoading = inboxQuery.isLoading;

  useEffect(() => {
    if (!socket) return;
    const handler = () => qc.invalidateQueries({ queryKey: ['inbox'] });
    socket.on('message.received', handler);
    return () => { socket.off('message.received', handler); };
  }, [socket, qc]);

  const pendingCount = inbox.filter(i => i.pendingClassification).length;
  const availableChannels = useMemo(() => uniqueChannelTypes(inbox), [inbox]);
  const scoped = tab === 'pendentes' ? inbox.filter(i => i.pendingClassification) : inbox;
  const channelScoped = channelFilter
    ? scoped.filter(i => i.channelType?.toLowerCase() === channelFilter)
    : scoped;
  const filtered = search
    ? channelScoped.filter(i =>
        (i.contactName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (i.contactPhone ?? '').includes(search) ||
        (i.lastMessageBody ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : channelScoped;

  const selected = inbox.find(i => i.id === selectedId) ?? null;
  const unreadCount = inbox.filter(i => i.unread).length;

  async function handleQualify(name: string): Promise<void> {
    if (!selected) return;
    await qualifyConversation(selected.id, name || selected.externalId || '');
    qc.invalidateQueries({ queryKey: ['inbox'] });
  }

  function handleSelect(item: InboxItem) {
    setSelectedId(item.id);
    if (item.unread) {
      qc.setQueryData<{ pages: InboxPage[]; pageParams: unknown[] }>(['inbox'], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.map((i) => (i.id === item.id ? { ...i, unread: false } : i)),
          })),
        };
      });
      markConversationRead(item.id).catch(() => {
        qc.invalidateQueries({ queryKey: ['inbox'] });
      });
    }
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--canvas)' }}>
      {/* Left: conversation list */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{ width: 320, background: 'var(--surface)', borderRight: '1px solid var(--edge)' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--edge)' }}>
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-[15px] font-semibold flex-1" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
              Inbox
            </h1>
            {unreadCount > 0 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
              >
                {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
            <button
              onClick={() => setTab('todas')}
              className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: tab === 'todas' ? 'var(--surface)' : 'transparent',
                color: tab === 'todas' ? 'var(--ink-1)' : 'var(--ink-3)',
                boxShadow: tab === 'todas' ? 'var(--shadow-sm)' : undefined,
              }}
            >
              Todas
            </button>
            <button
              onClick={() => setTab('pendentes')}
              className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1"
              style={{
                background: tab === 'pendentes' ? 'var(--surface)' : 'transparent',
                color: tab === 'pendentes' ? 'var(--ink-1)' : 'var(--ink-3)',
                boxShadow: tab === 'pendentes' ? 'var(--shadow-sm)' : undefined,
              }}
            >
              Qualificar
              {pendingCount > 0 && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>

          {availableChannels.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setChannelFilter(null)}
                className="px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors"
                style={
                  channelFilter === null
                    ? { background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' }
                    : { background: 'transparent', color: 'var(--ink-3)', borderColor: 'var(--edge)' }
                }
              >
                Todos
              </button>
              {availableChannels.map((type) => {
                const meta = channelMeta(type);
                const active = channelFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setChannelFilter(active ? null : type)}
                    className="px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors"
                    style={
                      active
                        ? { background: meta.fg, color: '#fff', borderColor: meta.fg }
                        : { background: meta.bg, color: meta.fg, borderColor: meta.border }
                    }
                  >
                    {meta.shortLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              {tab === 'pendentes'
                ? <Sparkles className="w-10 h-10" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                : <MessageCircle className="w-10 h-10" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
              }
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                  {search
                    ? 'Nenhuma conversa encontrada'
                    : tab === 'pendentes' ? 'Tudo qualificado' : 'Nenhuma conversa ainda'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
                  {!search && (tab === 'pendentes'
                    ? 'Contatos novos do WhatsApp aparecem aqui'
                    : 'As conversas do WhatsApp aparecerão aqui')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {filtered.map(item => (
                <ConvItem
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onClick={() => handleSelect(item)}
                />
              ))}
              {inboxQuery.hasNextPage && !channelFilter && tab === 'todas' && !search && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => inboxQuery.fetchNextPage()}
                    disabled={inboxQuery.isFetchingNextPage}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                    style={{ color: 'var(--ink-2)', borderColor: 'var(--edge)', background: 'var(--surface-hover)' }}
                  >
                    {inboxQuery.isFetchingNextPage ? (
                      <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Carregando...</span>
                    ) : (
                      `Carregar mais (${inbox.length}/${total})`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: chat or empty state */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {selected ? (
          <ChatView key={selected.id} item={selected} onQualify={handleQualify} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--ink-3)' }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--brand-50)' }}
            >
              <MessageCircle className="w-8 h-8" style={{ color: 'var(--brand-500)' }} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Selecione uma conversa</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Clique em uma conversa para ver as mensagens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
