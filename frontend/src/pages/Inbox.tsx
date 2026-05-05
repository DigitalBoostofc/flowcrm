import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  MessageCircle, Send, Search, Phone, Loader2, Sparkles, Activity,
  FileText, Paperclip, Mic, MicOff, File, Video, Trash2, SmilePlus, X,
  Check, CheckCheck, Users, Building2, ChevronDown, Tag, Plus, Pencil,
} from 'lucide-react';
import ConversationSummaryButton from '@/components/lead-panel/ConversationSummary';
import LeadActivities from '@/components/lead-panel/LeadActivities';
import InboxDataTab from '@/components/lead-panel/InboxDataTab';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { listInbox, markConversationRead, qualifyConversation, type InboxItem, type InboxPage } from '@/api/conversations';
import { listMessages, sendMessage, sendMedia, reactMessage, deleteMessage, transcribeAudio } from '@/api/messages';
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

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
      qc.setQueryData<{ pages: InboxPage[]; pageParams: unknown[] }>(['inbox'], (prev) => {
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

/* ── MessageBubble ────────────────────────────────────── */

function MessageBubble({ message, isOut, channelId, onDelete }: {
  message: Message;
  isOut: boolean;
  channelId: string;
  onDelete: (m: Message) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const reactMut = useMutation({
    mutationFn: (emoji: string) =>
      reactMessage({ messageId: message.externalMessageId ?? message.id, channelConfigId: channelId, emoji }),
  });

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

  const bubbleStyle = isOut
    ? { background: 'var(--brand-500)', color: '#fff', borderBottomRightRadius: 4 }
    : { background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', borderBottomLeftRadius: 4 };

  function renderContent() {
    if (message.type === 'deleted') {
      return <em className="text-sm opacity-60">Mensagem apagada</em>;
    }
    if (message.type === 'image') {
      return (
        <div>
          {message.mediaUrl ? (
            <a href={message.mediaUrl} target="_blank" rel="noreferrer">
              <img
                src={message.mediaUrl}
                alt={message.mediaCaption ?? 'Imagem'}
                className="max-w-[240px] rounded-lg object-cover"
                style={{ maxHeight: 200 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          ) : (
            <div className="flex items-center gap-2 py-1 opacity-60">
              <File className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-sm">Imagem</span>
            </div>
          )}
          {message.mediaCaption && <p className="text-sm mt-1 leading-relaxed">{message.mediaCaption}</p>}
        </div>
      );
    }
    if (message.type === 'video') {
      return (
        <div>
          {message.mediaUrl ? (
            <video controls src={message.mediaUrl} className="max-w-[240px] rounded-lg" style={{ maxHeight: 200 }} />
          ) : (
            <div className="flex items-center gap-2 py-1 opacity-60">
              <Video className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-sm">Vídeo</span>
            </div>
          )}
          {message.mediaCaption && <p className="text-sm mt-1">{message.mediaCaption}</p>}
        </div>
      );
    }
    if (message.type === 'audio') {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 py-1">
            <Mic className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            {message.mediaUrl ? (
              <audio controls src={message.mediaUrl} className="h-8" style={{ minWidth: 160 }} />
            ) : (
              <span className="text-sm opacity-60">Áudio</span>
            )}
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
    if (message.type === 'sticker') {
      return message.mediaUrl ? (
        <img
          src={message.mediaUrl}
          alt="Sticker"
          className="max-w-[120px] rounded-lg"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <span className="text-sm opacity-60">🎭 Sticker</span>
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

/* ── QualifyModal ─────────────────────────────────────── */

function QualifyModal({
  item,
  onConfirm,
  onClose,
}: {
  item: InboxItem;
  onConfirm: (payload: { name: string; type: 'person' | 'company'; pipelineId: string; stageId: string; assignedToId: string }) => Promise<void>;
  onClose: () => void;
}) {
  const { user: me } = useAuthStore();
  const [type, setType] = useState<'person' | 'company'>('person');
  const [name, setName] = useState(item.contactName ?? '');
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [assignedToId, setAssignedToId] = useState(me?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
  });

  const { data: members = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
  });

  // Set default pipeline + stage
  useEffect(() => {
    if (pipelines.length && !pipelineId) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setPipelineId(def.id);
      const sorted = (def.stages ?? []).slice().sort((a, b) => a.position - b.position);
      setStageId(sorted[0]?.id ?? '');
    }
  }, [pipelines, pipelineId]);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId) ?? null;
  const stages = (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position);

  const handlePipelineChange = (id: string) => {
    setPipelineId(id);
    const p = pipelines.find((p) => p.id === id);
    const sorted = (p?.stages ?? []).slice().sort((a, b) => a.position - b.position);
    setStageId(sorted[0]?.id ?? '');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Informe o nome.'); return; }
    if (!pipelineId) { setError('Selecione um funil.'); return; }
    if (!stageId) { setError('Selecione uma etapa.'); return; }
    if (!assignedToId) { setError('Selecione o responsável.'); return; }
    setSaving(true);
    setError('');
    try {
      await onConfirm({ name: name.trim(), type, pipelineId, stageId, assignedToId });
    } catch {
      setError('Erro ao qualificar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </span>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Qualificar contato</h3>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{item.externalId ?? item.contactPhone}</p>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ink-2)' }}>Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('person')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                background: type === 'person' ? 'var(--brand-50)' : 'var(--surface)',
                borderColor: type === 'person' ? 'var(--brand-500)' : 'var(--edge)',
                color: type === 'person' ? 'var(--brand-500)' : 'var(--ink-2)',
              }}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              Pessoa
            </button>
            <button
              onClick={() => setType('company')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                background: type === 'company' ? 'var(--brand-50)' : 'var(--surface)',
                borderColor: type === 'company' ? 'var(--brand-500)' : 'var(--edge)',
                color: type === 'company' ? 'var(--brand-500)' : 'var(--ink-2)',
              }}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              Empresa
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
            {type === 'person' ? 'Nome da pessoa' : 'Nome da empresa'}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'person' ? 'Ex: João Silva' : 'Ex: Acme Ltda'}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Pipeline */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Funil</label>
          <div className="relative">
            <select
              value={pipelineId}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', paddingRight: '2.5rem' }}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        {/* Stage */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Etapa</label>
          <div className="relative">
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)', paddingRight: '2.5rem' }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Responsável <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          <div className="relative">
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: 'var(--surface)', border: `1px solid ${!assignedToId ? 'var(--danger, #ef4444)' : 'var(--edge)'}`, color: 'var(--ink-1)', paddingRight: '2.5rem' }}
            >
              <option value="">Selecione o responsável…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === me?.id ? `Eu (${m.name})` : m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>

        {error && <p className="text-xs font-medium" style={{ color: 'var(--danger, #ef4444)' }}>{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm"
            style={{ color: 'var(--ink-2)', background: 'var(--surface-hover)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-500)' }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {saving ? 'Qualificando…' : 'Qualificar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ConvItem ─────────────────────────────────────────── */

function ConvItem({ item, selected, onClick }: { item: InboxItem; selected: boolean; onClick: () => void }) {
  const pending = item.pendingClassification;
  const ch = channelMeta(item.channelType);
  const [showTagPicker, setShowTagPicker] = useState(false);

  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative cursor-pointer"
      style={{
        background: selected ? 'var(--brand-50)' : 'transparent',
        borderBottom: '1px solid var(--edge)',
        borderLeft: selected ? '2px solid var(--brand-500)' : '2px solid transparent',
      }}
      onClick={onClick}
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
    </div>
  );
}

/* ── ChatView ─────────────────────────────────────────── */

type ChatTab = 'chat' | 'activities' | 'info';

const CHAT_TABS: { id: ChatTab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'activities', label: 'Atividades', icon: Activity },
  { id: 'info', label: 'Dados', icon: FileText },
];

function ChatView({ item, onQualify }: { item: InboxItem; onQualify: (payload: { name: string; type: 'person' | 'company'; pipelineId: string; stageId: string; assignedToId: string }) => Promise<void> }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
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
  useEffect(() => { setActiveTab('chat'); setBody(''); setSelectedFile(null); setShowQualifyModal(false); }, [item.id]);

  // Mark as read + sync full chat history when conversation opens
  useEffect(() => {
    if (!channelId || !item.externalId) return;
    api.post(`/channels/${channelId}/mark-read`, { chatId: item.externalId }).catch(() => {});
    api.post(`/channels/${channelId}/sync-chat`, { chatId: item.externalId, count: 50 })
      .then(() => qc.invalidateQueries({ queryKey: ['messages', item.id] }))
      .catch(() => {});
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
        </>
      )}

      {activeTab === 'activities' && item.leadId && (
        <div className="flex-1 overflow-auto">
          <LeadActivities leadId={item.leadId} />
        </div>
      )}

      {activeTab === 'info' && item.leadId && (
        <InboxDataTab leadId={item.leadId} />
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
  const [tab, setTab] = useState<'todas' | 'pendentes'>('todas');
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
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
