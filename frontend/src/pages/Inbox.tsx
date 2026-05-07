import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  MessageCircle, Send, Search, Phone, Loader2, Sparkles,
  Paperclip, Mic, MicOff, File, Video, Tag, Plus,
  Archive, ArchiveRestore, X, Check, Trash2,
} from 'lucide-react';
import ConversationSummaryButton from '@/components/lead-panel/ConversationSummary';
import MessageBubble from '@/components/inbox/MessageBubble';
import QualifyModal from '@/components/inbox/QualifyModal';
import RightSidebar from '@/components/inbox/RightSidebar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { listInbox, markConversationRead, qualifyConversation, archiveConversation, type InboxItem, type InboxPage } from '@/api/conversations';
import { listMessages, sendMessage, sendMedia, deleteMessage } from '@/api/messages';
import { listQuickReplies } from '@/api/quick-replies';
import { listChannels } from '@/api/channels';
import { listPipelines } from '@/api/pipelines';
import { getLead } from '@/api/leads';
import { listWorkspaceMembers } from '@/api/users';
import {
  listInboxTags, createInboxTag, deleteInboxTag, setConversationInboxTag,
  type InboxTag,
} from '@/api/inbox-tags';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/api/client';
import { useWs } from '@/hooks/useWebSocket';
import NegocioDetailPanel from '@/components/negocios/NegocioDetailPanel';
import type { Message, QuickReply, Pipeline, User } from '@/types/api';
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

/* ── Predefined tag colors ────────────────────────────── */
const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

/* ── InboxTagPicker ───────────────────────────────────── */

function InboxTagPicker({
  conversationId,
  currentTagId,
  onClose,
}: {
  conversationId: string;
  currentTagId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const ref = useRef<HTMLDivElement>(null);

  const { data: tags = [] } = useQuery({
    queryKey: ['inbox-tags'],
    queryFn: listInboxTags,
  });

  const assignMut = useMutation({
    mutationFn: (tagId: string | null) => setConversationInboxTag(conversationId, tagId),
    onSuccess: (_, tagId) => {
      qc.setQueriesData<{ pages: InboxPage[]; pageParams: unknown[] }>({ queryKey: ['inbox'] }, (prev) => {
        if (!prev) return prev;
        const tag = tags.find((t) => t.id === tagId);
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.map((i) =>
              i.id === conversationId
                ? { ...i, inboxTagId: tagId, inboxTagName: tag?.name ?? null, inboxTagColor: tag?.color ?? null }
                : i,
            ),
          })),
        };
      });
      onClose();
    },
  });

  const createMut = useMutation({
    mutationFn: () => createInboxTag({ name: newName.trim(), color: newColor }),
    onSuccess: (tag) => {
      qc.invalidateQueries({ queryKey: ['inbox-tags'] });
      assignMut.mutate(tag.id);
      setCreating(false);
      setNewName('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInboxTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-tags'] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 rounded-xl shadow-xl border overflow-hidden"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--edge)', minWidth: 220 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--edge)' }}>
        <Tag className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Etiqueta do atendimento</span>
      </div>

      <div className="py-1" style={{ maxHeight: 240, overflowY: 'auto' }}>
        {/* Remove tag option */}
        {currentTagId && (
          <button
            onClick={() => assignMut.mutate(null)}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:opacity-80"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-3 h-3" />
            Remover etiqueta
          </button>
        )}

        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 px-3 py-1.5 group"
            style={{ borderBottom: '1px solid var(--edge)' }}
          >
            <button
              onClick={() => assignMut.mutate(tag.id === currentTagId ? null : tag.id)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: tag.color }}
              />
              <span
                className="text-xs truncate"
                style={{ color: tag.id === currentTagId ? 'var(--ink-1)' : 'var(--ink-2)', fontWeight: tag.id === currentTagId ? 600 : 400 }}
              >
                {tag.name}
              </span>
              {tag.id === currentTagId && <Check className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'var(--brand-500)' }} />}
            </button>
            <button
              onClick={() => { if (window.confirm(`Excluir etiqueta "${tag.name}"?`)) deleteMut.mutate(tag.id); }}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded transition-opacity"
              style={{ color: 'var(--ink-3)' }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {tags.length === 0 && !creating && (
          <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--ink-3)' }}>
            Nenhuma etiqueta criada ainda
          </p>
        )}
      </div>

      {/* Create new tag */}
      {creating ? (
        <div className="px-3 py-2 border-t space-y-2" style={{ borderColor: 'var(--edge)' }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="Nome da etiqueta..."
            className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          />
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-4 h-4 rounded-full transition-all"
                style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => { if (newName.trim()) createMut.mutate(); }}
              disabled={!newName.trim() || createMut.isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--brand-500)' }}
            >
              {createMut.isPending ? 'Criando…' : 'Criar'}
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(''); }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--ink-2)', background: 'var(--surface-hover)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs border-t"
          style={{ color: 'var(--brand-500)', borderColor: 'var(--edge)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nova etiqueta
        </button>
      )}
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

function ConvItem({ item, selected, onClick, onArchive, isArchived }: {
  item: InboxItem;
  selected: boolean;
  onClick: () => void;
  onArchive: () => void;
  isArchived?: boolean;
}) {
  const pending = item.pendingClassification;
  const ch = channelMeta(item.channelType);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative cursor-pointer group"
      style={{
        background: selected ? 'var(--brand-50)' : 'transparent',
        borderBottom: '1px solid var(--edge)',
        borderLeft: selected ? '2px solid var(--brand-500)' : '2px solid transparent',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar name={item.contactName ?? item.fromName} url={item.contactAvatarUrl ?? item.fromAvatarUrl} size={36} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>
            {item.contactName ?? item.fromName ?? item.externalId ?? 'Desconhecido'}
          </span>
          <span className="text-[10px] flex-shrink-0 flex items-center gap-1.5" style={{ color: 'var(--ink-3)' }}>
            {/* Channel badge — clicking opens the tag picker */}
            <span className="relative">
              <button
                title="Etiqueta de atendimento"
                onClick={(e) => { e.stopPropagation(); setShowTagPicker((v) => !v); }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold border transition-opacity hover:opacity-80"
                style={
                  item.inboxTagId && item.inboxTagColor
                    ? { background: item.inboxTagColor + '22', color: item.inboxTagColor, borderColor: item.inboxTagColor + '55', fontSize: 9 }
                    : { background: ch.bg, color: ch.fg, borderColor: ch.border, fontSize: 9 }
                }
              >
                {item.inboxTagId && item.inboxTagName ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.inboxTagColor ?? undefined }} />
                    {item.inboxTagName}
                  </>
                ) : (
                  ch.shortLabel
                )}
              </button>

              {showTagPicker && (
                <InboxTagPicker
                  conversationId={item.id}
                  currentTagId={item.inboxTagId}
                  onClose={() => setShowTagPicker(false)}
                />
              )}
            </span>
            {timeAgo(item.lastMessageSentAt ?? item.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.unread && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
          )}
          {pending ? (
            <span
              className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
              Qualificar
            </span>
          ) : item.assignedToName ? (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(99,91,255,0.12)', color: 'var(--brand-500)' }}
            >
              {item.assignedToName}
            </span>
          ) : null}
          <p className="text-xs truncate" style={{ color: item.unread ? 'var(--ink-2)' : 'var(--ink-3)', fontWeight: item.unread ? 500 : 400 }}>
            {item.lastMessageDirection === 'outbound' && <span style={{ color: 'var(--ink-3)' }}>Você: </span>}
            {item.lastMessageBody ?? 'Nenhuma mensagem'}
          </p>
        </div>
      </div>

      {/* Archive / Unarchive button — shows on hover */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          title={isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-opacity opacity-0 group-hover:opacity-100"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
        >
          {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

/* ── ChatView ─────────────────────────────────────────── */

function ChatView({ item, onQualify, onArchive, isArchived }: {
  item: InboxItem;
  onQualify: (payload: { name: string; type: 'person' | 'company'; pipelineId: string; stageId: string; assignedToId: string }) => Promise<void>;
  onArchive: () => void;
  isArchived?: boolean;
}) {
  const qc = useQueryClient();
  const [showQualifyModal, setShowQualifyModal] = useState(false);
  const [body, setBody] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const messages = [...rawMessages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

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

  // Reset state on conversation switch
  useEffect(() => { setBody(''); setSelectedFile(null); setShowQualifyModal(false); }, [item.id]);

  // Mark as read + sync full chat history when conversation opens
  useEffect(() => {
    if (!channelId || !item.externalId) return;
    api.post(`/channels/${channelId}/mark-read`, { chatId: item.externalId }).catch(() => {});
    api.post(`/channels/${channelId}/sync-chat`, { chatId: item.externalId, count: 50 })
      .then(() => qc.invalidateQueries({ queryKey: ['messages', item.id] }))
      .catch(() => {});
  }, [item.id, channelId]);

  // Send text mutation — optimistic update adds temp message immediately
  const sendMut = useMutation({
    mutationFn: (capturedBody: string) =>
      sendMessage({ conversationId: item.id, channelConfigId: channelId, body: capturedBody }),
    onMutate: async (capturedBody) => {
      await qc.cancelQueries({ queryKey: ['messages', item.id] });
      const prevMessages = qc.getQueryData<Message[]>(['messages', item.id]) ?? [];
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setBody('');
      qc.setQueryData<Message[]>(['messages', item.id], [
        ...prevMessages,
        {
          id: tempId,
          conversationId: item.id,
          body: capturedBody,
          direction: 'outbound',
          type: 'text',
          status: 'pending',
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ]);
      return { tempId, prevMessages, capturedBody };
    },
    onSuccess: (realMsg, _vars, context) => {
      qc.setQueryData<Message[]>(['messages', item.id], (prev = []) =>
        prev.map((m) => (m.id === context!.tempId ? realMsg : m)),
      );
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
    onError: (_err, _vars, context) => {
      if (context) {
        qc.setQueryData<Message[]>(['messages', item.id], context.prevMessages);
        setBody(context.capturedBody);
      }
    },
  });

  // Send media mutation — optimistic update with local blob preview
  const sendMediaMut = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
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
        mediaCaption: caption || undefined,
      });
    },
    onMutate: async ({ file, caption }) => {
      await qc.cancelQueries({ queryKey: ['messages', item.id] });
      const prevMessages = qc.getQueryData<Message[]>(['messages', item.id]) ?? [];
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile(null);
      setBody('');
      qc.setQueryData<Message[]>(['messages', item.id], [
        ...prevMessages,
        {
          id: tempId,
          conversationId: item.id,
          body: caption,
          direction: 'outbound',
          type: getMediaType(file.type),
          status: 'pending',
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          mediaUrl: previewUrl,
          mediaMimeType: file.type,
          mediaCaption: caption || null,
          mediaFileName: file.name,
        },
      ]);
      return { tempId, prevMessages, caption, previewUrl };
    },
    onSuccess: (realMsg, _vars, context) => {
      if (context?.previewUrl) URL.revokeObjectURL(context.previewUrl);
      qc.setQueryData<Message[]>(['messages', item.id], (prev = []) =>
        prev.map((m) => (m.id === context!.tempId ? realMsg : m)),
      );
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
    onError: (_err, _vars, context) => {
      if (context) {
        if (context.previewUrl) URL.revokeObjectURL(context.previewUrl);
        qc.setQueryData<Message[]>(['messages', item.id], context.prevMessages);
        setBody(context.caption);
      }
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
      sendMediaMut.mutate({ file: selectedFile, caption: body.trim() });
    } else {
      if (!body.trim() || !channelId || sendMut.isPending) return;
      sendMut.mutate(body.trim());
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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = Object.assign(blob, { name: `audio-${Date.now()}.${ext}`, lastModified: Date.now() }) as unknown as File;
        setSelectedFile(file);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      /* microphone permission denied — silently ignore */
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const phone = item.contactPhone ?? item.externalId;
  const isSending = sendMut.isPending || sendMediaMut.isPending;
  const canSend = (selectedFile || body.trim()) && channelId && !isSending && activeChannels.length > 0;

  return (
    <div className="flex h-full">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
        >
          <Avatar name={item.contactName ?? item.fromName} url={item.contactAvatarUrl ?? item.fromAvatarUrl} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              {item.contactName ?? item.fromName ?? item.externalId ?? 'Desconhecido'}
            </div>
            {phone && (
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}>
                <Phone className="w-3 h-3" strokeWidth={1.75} />
                {phone}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.pendingClassification ? (
              <button
                onClick={() => setShowQualifyModal(true)}
                className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                Qualificar
              </button>
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
            <button
              onClick={onArchive}
              title={isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
            >
              {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

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
                onDelete={(msg: Message) => deleteMut.mutate(msg)}
              />
            ))
          )}
        </div>

        {/* Composer */}
        <div
          className="flex-shrink-0 px-4 py-3 space-y-2 relative"
          style={{ borderTop: '1px solid var(--edge)', background: 'var(--surface)' }}
        >
          {showQuickReplies && (
            <QuickRepliesPopup
              search={quickReplySearch}
              onSelect={handleQuickReplySelect}
              onClose={() => setShowQuickReplies(false)}
            />
          )}

          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#ef4444' }} />
              <span className="text-xs font-medium" style={{ color: '#ef4444' }}>Gravando... Clique em parar para enviar.</span>
            </div>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={activeChannels.length === 0 || isRecording}
              title="Anexar arquivo"
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity hover:opacity-80"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
            >
              <Paperclip className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={activeChannels.length === 0 || !!selectedFile}
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all hover:opacity-80"
              style={isRecording
                ? { background: '#ef4444', color: '#fff', border: 'none' }
                : { background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }
              }
            >
              {isRecording
                ? <MicOff className="w-4 h-4" strokeWidth={1.75} />
                : <Mic className="w-4 h-4" strokeWidth={1.75} />
              }
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
      </div>

      {/* Right sidebar — Atividades / Dados */}
      {item.leadId && (
        <RightSidebar leadId={item.leadId} conversationId={item.id} />
      )}

      {showQualifyModal && (
        <QualifyModal
          item={item}
          onConfirm={async (payload) => {
            await onQualify(payload);
            setShowQualifyModal(false);
          }}
          onClose={() => setShowQualifyModal(false)}
        />
      )}
    </div>
  );
}

/* ── Inbox Page ───────────────────────────────────────── */

export default function Inbox() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'todas' | 'pendentes' | 'arquivadas'>('todas');
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const { user: currentUser } = useAuthStore();
  const { socket } = useWs();

  const { data: openLead } = useQuery({
    queryKey: ['lead', openLeadId],
    queryFn: () => getLead(openLeadId!),
    enabled: !!openLeadId,
  });

  const { data: inboxPipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
    enabled: !!openLeadId,
  });

  const { data: inboxMembers = [] } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
    enabled: !!openLeadId,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['inbox-tags'],
    queryFn: listInboxTags,
  });

  const apiFilter = tab === 'arquivadas' ? 'archived' : 'all';

  const PAGE_SIZE = 50;
  const inboxQuery = useInfiniteQuery({
    queryKey: ['inbox', { filter: apiFilter, tagId: tagFilter }],
    queryFn: ({ pageParam = 1 }) => listInbox({
      page: pageParam,
      pageSize: PAGE_SIZE,
      filter: apiFilter,
      tagId: tagFilter ?? undefined,
    }),
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

  async function handleArchive(item: InboxItem, archive: boolean) {
    // Optimistically remove from current list
    qc.setQueryData<{ pages: InboxPage[]; pageParams: unknown[] }>(['inbox', { filter: apiFilter, tagId: tagFilter }], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) => ({
          ...p,
          items: p.items.filter((i) => i.id !== item.id),
        })),
      };
    });
    if (selectedId === item.id) setSelectedId(null);
    try {
      await archiveConversation(item.id, archive);
      qc.invalidateQueries({ queryKey: ['inbox'] });
    } catch {
      qc.invalidateQueries({ queryKey: ['inbox'] });
    }
  }

  const pendingCount = inbox.filter(i => i.pendingClassification).length;
  const availableChannels = useMemo(() => uniqueChannelTypes(inbox), [inbox]);
  // "pendentes" is a client-side subset of "todas" (both use filter=all from API)
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

  async function handleQualify(payload: { name: string; type: 'person' | 'company'; pipelineId: string; stageId: string; assignedToId: string }): Promise<void> {
    if (!selected) return;
    const result = await qualifyConversation(selected.id, payload);
    qc.invalidateQueries({ queryKey: ['inbox'] });
    qc.invalidateQueries({ queryKey: ['negocios'] });
    setOpenLeadId(result.leadId);
  }

  function handleSelect(item: InboxItem) {
    setSelectedId(item.id);
    if (item.unread) {
      qc.setQueryData<{ pages: InboxPage[]; pageParams: unknown[] }>(['inbox', { filter: apiFilter, tagId: tagFilter }], (prev) => {
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

          {/* Main filter tabs */}
          <div className="flex gap-1 mb-2 p-0.5 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
            {(['todas', 'pendentes', 'arquivadas'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setTagFilter(null); setChannelFilter(null); }}
                className="flex-1 px-1.5 py-1.5 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1"
                style={{
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--ink-1)' : 'var(--ink-3)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : undefined,
                }}
              >
                {t === 'todas' && 'Todas'}
                {t === 'pendentes' && (
                  <>
                    Qualificar
                    {pendingCount > 0 && (
                      <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full"
                        style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                        {pendingCount}
                      </span>
                    )}
                  </>
                )}
                {t === 'arquivadas' && (
                  <span className="flex items-center gap-0.5">
                    <Archive className="w-3 h-3" />
                    Arquivadas
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tagFilter !== null && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors"
                  style={{ background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' }}
                >
                  Todas
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all"
                  style={
                    tagFilter === tag.id
                      ? { background: tag.color, color: '#fff', borderColor: tag.color }
                      : { background: tag.color + '22', color: tag.color, borderColor: tag.color + '55' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tagFilter === tag.id ? '#fff' : tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          )}

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
                : tab === 'arquivadas'
                  ? <Archive className="w-10 h-10" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                  : <MessageCircle className="w-10 h-10" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
              }
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                  {search
                    ? 'Nenhuma conversa encontrada'
                    : tab === 'pendentes' ? 'Tudo qualificado'
                    : tab === 'arquivadas' ? 'Nenhuma conversa arquivada'
                    : 'Nenhuma conversa ainda'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
                  {!search && (tab === 'pendentes'
                    ? 'Contatos novos do WhatsApp aparecem aqui'
                    : tab === 'arquivadas' ? 'Conversas arquivadas aparecem aqui'
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
                  onArchive={() => handleArchive(item, tab !== 'arquivadas')}
                  isArchived={tab === 'arquivadas'}
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
          <ChatView
            key={selected.id}
            item={selected}
            onQualify={handleQualify}
            onArchive={() => handleArchive(selected, tab !== 'arquivadas')}
            isArchived={tab === 'arquivadas'}
          />
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

      {/* Lead detail overlay after qualification */}
      {openLead && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpenLeadId(null)}
        >
          <div
            className="absolute right-0 top-0 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <NegocioDetailPanel
              lead={openLead}
              currentUser={currentUser ?? null}
              users={inboxMembers as User[]}
              pipelines={inboxPipelines}
              onClose={() => setOpenLeadId(null)}
              autoOpenEdit={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
