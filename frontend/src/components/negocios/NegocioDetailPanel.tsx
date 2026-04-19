import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Star, MoreHorizontal, Plus, Mail, Phone, MessageSquare, FileText,
  PhoneCall, Users as UsersIcon, MapPin, StickyNote, Clock, Check,
  Trophy, Ban, TrendingDown, Copy, Pin, HelpCircle, ChevronRight, ChevronDown,
} from 'lucide-react';
import type { Lead, LeadStatus, LeadActivity, ActivityType, Pipeline, User, Stage } from '@/types/api';
import { updateLead, updateLeadStatus, moveLead } from '@/api/leads';
import { updateContact } from '@/api/contacts';
import { getLeadActivities, createLeadActivity } from '@/api/lead-activities';

/* ── Avatar helpers ──────────────────────────────────── */

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#f97316', '#0ea5e9',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, id, size = 28 }: { name: string; id: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </div>
  );
}

/* ── Formatters ──────────────────────────────────────── */

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dOnly = new Date(d);
  dOnly.setHours(0, 0, 0, 0);
  const diff = daysBetween(dOnly, today);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return d.toLocaleDateString('pt-BR');
}

function timeInStage(stageEnteredAt: string) {
  const d = new Date(stageEnteredAt);
  const now = new Date();
  const diff = daysBetween(now, d);
  if (diff < 1) return '<1d';
  return `${diff}d`;
}

function formatDateTime(s: string) {
  const d = new Date(s);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

/* ── Inline editable field ───────────────────────────── */

function InlineField({
  label, value, placeholder = 'Adicionar', onSave, type = 'text', multiline,
}: {
  label: string;
  value?: string | number | null;
  placeholder?: string;
  onSave: (v: string) => Promise<unknown> | void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date';
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : '');
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value != null ? String(value) : ''); }, [value]);
  useEffect(() => {
    if (editing) (multiline ? areaRef.current : inputRef.current)?.focus();
  }, [editing, multiline]);

  const commit = async () => {
    if (draft !== (value != null ? String(value) : '')) {
      await onSave(draft.trim());
    }
    setEditing(false);
  };

  return (
    <div className="grid items-start gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
      <div className="text-xs pt-0.5" style={{ color: 'var(--ink-3)' }}>{label}</div>
      {editing ? (
        multiline ? (
          <textarea
            ref={areaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            rows={3}
            className="px-2 py-1 rounded text-sm outline-none resize-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--brand-500, #6366f1)', color: 'var(--ink-1)' }}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setDraft(value != null ? String(value) : ''); setEditing(false); }
            }}
            className="px-2 py-1 rounded text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--brand-500, #6366f1)', color: 'var(--ink-1)' }}
          />
        )
      ) : value ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm whitespace-pre-wrap"
          style={{ color: 'var(--ink-1)' }}
        >
          {value}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm font-medium"
          style={{ color: 'var(--brand-500, #6366f1)' }}
        >
          {placeholder}
        </button>
      )}
    </div>
  );
}

/* ── Activity type config ────────────────────────────── */

type ComposerType = ActivityType | 'note';

const COMPOSER_TABS: { key: ComposerType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'note',     label: 'Nota',     icon: StickyNote },
  { key: 'call',     label: 'Ligação',  icon: PhoneCall },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'proposal', label: 'Proposta', icon: FileText },
  { key: 'meeting',  label: 'Reunião',  icon: UsersIcon },
  { key: 'visit',    label: 'Visita',   icon: MapPin },
];

/* ── Status meta ─────────────────────────────────────── */

const STATUS_LABELS: Record<LeadStatus, string> = {
  active: 'Em andamento',
  won: 'Ganho',
  lost: 'Perdido',
};

/* ── Main panel ──────────────────────────────────────── */

export interface NegocioDetailPanelProps {
  lead: Lead;
  currentUser: User | null;
  users: User[];
  pipelines: Pipeline[];
  onClose: () => void;
}

export default function NegocioDetailPanel({ lead, currentUser, users, pipelines, onClose }: NegocioDetailPanelProps) {
  const qc = useQueryClient();
  const [composerType, setComposerType] = useState<ComposerType>('note');
  const [activityText, setActivityText] = useState('');
  const [subTab, setSubTab] = useState<'historico' | 'fixadas'>('historico');
  const [copied, setCopied] = useState(false);
  const [pipelinePickerOpen, setPipelinePickerOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');

  /* ESC to close */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const assignedTo = useMemo(
    () => users.find((u) => u.id === lead.assignedToId) ?? lead.assignedTo ?? null,
    [users, lead.assignedToId, lead.assignedTo],
  );
  const createdBy = useMemo(
    () => users.find((u) => u.id === lead.createdById) ?? lead.createdBy ?? null,
    [users, lead.createdById, lead.createdBy],
  );

  const pipeline = useMemo(() => {
    if (lead.pipeline?.stages?.length) return lead.pipeline;
    return pipelines.find((p) => p.id === lead.pipelineId) ?? lead.pipeline ?? null;
  }, [lead.pipeline, lead.pipelineId, pipelines]);

  const stages: Stage[] = useMemo(
    () => (pipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position),
    [pipeline],
  );

  const conclusionBadge = useMemo(() => {
    if (!lead.conclusionDate) return null;
    const d = new Date(lead.conclusionDate);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = daysBetween(d, today);
    if (diff >= 0) return { text: `Conclusão em ${diff} dia${diff !== 1 ? 's' : ''}`, positive: true };
    return { text: `Atrasado em ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`, positive: false };
  }, [lead.conclusionDate]);

  /* Activities */
  const { data: activities = [] } = useQuery({
    queryKey: ['lead-activities', lead.id],
    queryFn: () => getLeadActivities(lead.id),
  });

  /* Mutations */
  const leadMut = useMutation({
    mutationFn: (patch: Record<string, any>) => updateLead(lead.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(lead.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['negocios'] }),
  });

  const stageMut = useMutation({
    mutationFn: (stageId: string) => moveLead(lead.id, stageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['negocios'] }),
  });

  const pipelineMut = useMutation({
    mutationFn: (pipelineId: string) => {
      const target = pipelines.find(p => p.id === pipelineId);
      const firstStage = target?.stages?.slice().sort((a, b) => a.position - b.position)[0];
      if (!firstStage) throw new Error('Funil sem etapas');
      return moveLead(lead.id, firstStage.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      setPipelinePickerOpen(false);
      setSelectedPipelineId('');
    },
  });

  const contactMut = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string | null }) =>
      updateContact(lead.contactId, { [field]: value ?? undefined } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['pessoas'] });
    },
  });

  const activityMut = useMutation({
    mutationFn: (data: { type: ActivityType; body: string }) => createLeadActivity(lead.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', lead.id] });
      setActivityText('');
    },
  });

  const sendActivity = () => {
    const body = activityText.trim();
    if (!body) return;
    const type: ActivityType = composerType === 'note' ? 'note' : composerType;
    activityMut.mutate({ type, body });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(lead.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const openMail = () => {
    if (lead.contact?.email) window.open(`mailto:${lead.contact.email}`);
  };
  const openCall = () => {
    const phone = lead.contact?.celular || lead.contact?.phone;
    if (phone) window.open(`tel:${phone}`);
  };
  const openWhats = () => {
    const wa = lead.contact?.whatsapp || lead.contact?.celular || lead.contact?.phone;
    if (wa) window.open(`https://wa.me/${wa.replace(/\D/g, '')}`, '_blank');
  };

  const displayTitle = lead.title ?? lead.contact?.name ?? 'Sem título';
  const currentStageIdx = stages.findIndex((s) => s.id === lead.stageId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl w-full my-4 animate-fade-up"
        style={{ maxWidth: '1100px', background: 'var(--surface-raised)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top row: title + close */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <InlineTitle value={displayTitle} onSave={(v) => leadMut.mutateAsync({ title: v || undefined })} />
              {conclusionBadge && (
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    background: conclusionBadge.positive ? '#dcfce7' : '#fee2e2',
                    color: conclusionBadge.positive ? '#166534' : '#991b1b',
                  }}
                >
                  {conclusionBadge.text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {lead.contact && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--brand-500, #6366f1)' }}>
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span className="font-medium">{lead.contact.name}</span>
                </span>
              )}
              <Stars value={lead.ranking ?? 0} onChange={(r) => leadMut.mutate({ ranking: r })} />
              {assignedTo && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                  <Avatar name={assignedTo.name} id={assignedTo.id} size={20} />
                  {assignedTo.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status buttons */}
            <StatusButton
              active={lead.status === 'lost'}
              onClick={() => statusMut.mutate('lost')}
              icon={Ban}
              label="Perdido"
              activeBg="#fee2e2"
              activeFg="#991b1b"
            />
            <StatusButton
              active={lead.status === 'active'}
              onClick={() => statusMut.mutate('active')}
              icon={TrendingDown}
              label="Em andamento"
              activeBg="#fef3c7"
              activeFg="#a16207"
            />
            <StatusButton
              active={lead.status === 'won'}
              onClick={() => statusMut.mutate('won')}
              icon={Trophy}
              label="Ganho"
              activeBg="#dcfce7"
              activeFg="#166534"
            />
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)' }}
              title="Mais opções"
            >
              <MoreHorizontal className="w-4 h-4" /> Mais opções
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-3)' }}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage progress */}
        {stages.length > 0 && (
          <div className="px-6 pb-4">
            <div
              className="flex items-stretch rounded-lg overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              <div className="relative flex-shrink-0" style={{ borderRight: '1px solid var(--edge)' }}>
                <button
                  onClick={() => {
                    setSelectedPipelineId(lead.pipelineId ?? '');
                    setPipelinePickerOpen(o => !o);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--ink-2)' }}
                  title="Trocar funil"
                >
                  <span className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--brand-500, #6366f1)' }} />
                  {pipeline?.name ?? 'Funil'}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {pipelinePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPipelinePickerOpen(false)} />
                    <div
                      className="absolute top-full left-0 mt-1 rounded-xl shadow-xl z-20 min-w-[220px] py-2"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge-strong)' }}
                    >
                      <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                        Selecione o funil
                      </p>
                      {pipelines.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPipelineId(p.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--surface-hover)]"
                          style={{ color: selectedPipelineId === p.id ? 'var(--brand-500)' : 'var(--ink-1)', fontWeight: selectedPipelineId === p.id ? 600 : 400 }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: selectedPipelineId === p.id ? 'var(--brand-500)' : 'var(--edge-strong)' }}
                          />
                          {p.name}
                          {p.id === lead.pipelineId && (
                            <span className="ml-auto text-[10px]" style={{ color: 'var(--ink-3)' }}>atual</span>
                          )}
                        </button>
                      ))}
                      <div className="px-3 pt-2 mt-1" style={{ borderTop: '1px solid var(--edge)' }}>
                        <button
                          onClick={() => {
                            if (selectedPipelineId && selectedPipelineId !== lead.pipelineId) {
                              pipelineMut.mutate(selectedPipelineId);
                            } else {
                              setPipelinePickerOpen(false);
                            }
                          }}
                          disabled={!selectedPipelineId || pipelineMut.isPending}
                          className="w-full h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                          style={{ background: 'var(--brand-500)' }}
                        >
                          {pipelineMut.isPending ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {stages.map((s, idx) => {
                const isCurrent = idx === currentStageIdx;
                const isPast = idx < currentStageIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => !isCurrent && stageMut.mutate(s.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-all relative"
                    style={{
                      background: isCurrent
                        ? 'var(--brand-500, #6366f1)'
                        : isPast
                          ? 'rgba(99,102,241,0.1)'
                          : 'transparent',
                      color: isCurrent ? '#fff' : isPast ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
                    }}
                  >
                    <span className="truncate">{s.name}</span>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[10px] opacity-90">
                        <Clock className="w-3 h-3" />
                        {timeInStage(lead.stageEnteredAt)}
                      </span>
                    )}
                    {idx < stages.length - 1 && (
                      <ChevronRight
                        className="w-3 h-3 absolute -right-1.5 top-1/2 -translate-y-1/2 z-10"
                        style={{ color: isCurrent ? '#fff' : 'var(--ink-3)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Two column body */}
        <div
          className="grid gap-4 px-6 pb-6"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}
        >
          {/* LEFT — composer + feed */}
          <div className="min-w-0 space-y-3">
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              {/* Type tabs */}
              <div className="flex flex-wrap gap-0.5 px-2 pt-2">
                {COMPOSER_TABS.map(({ key, label, icon: Icon }) => {
                  const active = composerType === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setComposerType(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      style={{
                        color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                        background: active ? 'var(--surface-hover)' : 'transparent',
                        borderBottom: active ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <div className="p-3 pt-2">
                <textarea
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder="O que foi feito e qual o próximo passo?"
                  rows={3}
                  className="w-full px-2 py-2 rounded-md outline-none text-sm resize-none"
                  style={{ background: 'transparent', color: 'var(--ink-1)' }}
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: 'var(--brand-500, #6366f1)' }}
                  >
                    <FileText className="w-3.5 h-3.5" /> Modelos
                  </button>
                  <button
                    onClick={sendActivity}
                    disabled={!activityText.trim() || activityMut.isPending}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: 'var(--brand-500, #6366f1)' }}
                  >
                    {activityMut.isPending ? 'Enviando...' : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sub tabs */}
            <div className="flex items-center gap-4 border-b" style={{ borderColor: 'var(--edge)' }}>
              <button
                onClick={() => setSubTab('historico')}
                className="flex items-center gap-1.5 px-1 py-2 text-sm font-medium transition-colors"
                style={{
                  color: subTab === 'historico' ? 'var(--ink-1)' : 'var(--ink-3)',
                  borderBottom: subTab === 'historico' ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
                }}
              >
                <Check className="w-3.5 h-3.5" /> Histórico de atividades
              </button>
              <button
                onClick={() => setSubTab('fixadas')}
                className="flex items-center gap-1.5 px-1 py-2 text-sm font-medium transition-colors"
                style={{
                  color: subTab === 'fixadas' ? 'var(--ink-1)' : 'var(--ink-3)',
                  borderBottom: subTab === 'fixadas' ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
                }}
              >
                <Pin className="w-3.5 h-3.5" /> Fixadas
              </button>
            </div>

            {/* Feed */}
            {activities.length === 0 ? (
              <EmptyFeed />
            ) : (
              <div className="space-y-2">
                {activities.map((a) => (
                  <ActivityItem key={a.id} activity={a} users={users} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT sidebar */}
          <div className="space-y-3 min-w-0">
            {/* Ações */}
            <SidebarCard title="Ações">
              <div className="grid grid-cols-2 gap-2">
                <ActionButton icon={Mail} label="Enviar e-mail" onClick={openMail} disabled={!lead.contact?.email} />
                <ActionButton icon={PhoneCall} label="Fazer ligação" onClick={openCall} disabled={!lead.contact?.celular && !lead.contact?.phone} />
                <ActionButton icon={FileText} label="Gerar proposta" onClick={() => { /* TODO */ }} />
                <ActionButton icon={MessageSquare} label="Enviar WhatsApp" onClick={openWhats} disabled={!lead.contact?.whatsapp && !lead.contact?.celular && !lead.contact?.phone} />
              </div>
            </SidebarCard>

            {/* Valor do negócio */}
            <SidebarCard title="Valor do negócio">
              <div className="text-xl font-bold" style={{ color: 'var(--ink-1)' }}>
                {formatBRL(Number(lead.value ?? 0))}
              </div>
              <div className="mt-3">
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Produtos e serviços</div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  Nenhum produto ou serviço foi adicionado a este negócio
                </div>
                <button
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--brand-500, #6366f1)', border: '1px dashed var(--edge)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar produtos/serviços
                </button>
              </div>
            </SidebarCard>

            {/* Dados do negócio */}
            <SidebarCard title="Dados do negócio">
              <div className="space-y-0">
                <InlineResponsavel
                  label="Responsável"
                  users={users}
                  value={lead.assignedToId ?? null}
                  onSave={(id) => leadMut.mutateAsync({ assignedToId: id ?? null })}
                />
                <InlineField
                  label="Data de início"
                  type="date"
                  value={lead.startDate ? String(lead.startDate).slice(0, 10) : ''}
                  placeholder={lead.startDate ? formatDayLabel(lead.startDate) : 'Adicionar'}
                  onSave={(v) => leadMut.mutateAsync({ startDate: v || null })}
                />
                <InlineField
                  label="Data de conclusão"
                  type="date"
                  value={lead.conclusionDate ? String(lead.conclusionDate).slice(0, 10) : ''}
                  placeholder={lead.conclusionDate ? formatDayLabel(lead.conclusionDate) : 'Adicionar'}
                  onSave={(v) => leadMut.mutateAsync({ conclusionDate: v || null })}
                />
                <InlineField
                  label="Descrição"
                  value={lead.notes ?? ''}
                  multiline
                  onSave={(v) => leadMut.mutateAsync({ notes: v })}
                />
              </div>
            </SidebarCard>

            {/* Dados do contato */}
            {lead.contact && (
              <SidebarCard title="Dados do contato">
                <div
                  className="flex items-center gap-2 p-2 rounded-md mb-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <Avatar name={lead.contact.name} id={lead.contact.id} size={28} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>
                    {lead.contact.name}
                  </span>
                </div>
                <div className="space-y-0">
                  <InlineField
                    label="Email"
                    type="email"
                    value={lead.contact.email ?? ''}
                    onSave={(v) => contactMut.mutateAsync({ field: 'email', value: v || null })}
                  />
                  <InlineField
                    label="Celular"
                    type="tel"
                    value={lead.contact.celular ?? ''}
                    onSave={(v) => contactMut.mutateAsync({ field: 'celular', value: v || null })}
                  />
                  <InlineField
                    label="WhatsApp"
                    type="tel"
                    value={lead.contact.whatsapp ?? ''}
                    onSave={(v) => contactMut.mutateAsync({ field: 'whatsapp', value: v || null })}
                  />
                  <InlineField
                    label="Telefone"
                    type="tel"
                    value={lead.contact.phone ?? ''}
                    onSave={(v) => contactMut.mutateAsync({ field: 'phone', value: v || null })}
                  />
                  <AddressRow contact={lead.contact} />
                </div>
              </SidebarCard>
            )}

            {/* Código do negócio */}
            <SidebarCard
              title={
                <span className="inline-flex items-center gap-1">
                  Código do negócio <HelpCircle className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                </span>
              }
            >
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-md"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
              >
                <code className="text-xs flex-1 truncate font-mono" style={{ color: 'var(--ink-2)' }}>
                  {lead.id}
                </code>
                <button
                  onClick={copyCode}
                  className="p-1 rounded hover:bg-[var(--surface-hover)]"
                  style={{ color: copied ? '#22c55e' : 'var(--ink-3)' }}
                  title={copied ? 'Copiado!' : 'Copiar'}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </SidebarCard>

            {/* Metadata */}
            <div className="text-xs space-y-1 px-1" style={{ color: 'var(--ink-3)' }}>
              {createdBy && (
                <div>• Criado por {createdBy.name} em {formatDateTime(lead.createdAt)}</div>
              )}
              <div>• Última atualização em {formatDateTime(lead.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function InlineTitle({ value, onSave }: { value: string; onSave: (v: string) => Promise<unknown> | void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={async () => {
          if (draft.trim() && draft !== value) await onSave(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="text-xl font-bold bg-transparent outline-none px-1 rounded"
        style={{ color: 'var(--ink-1)', border: '1px solid var(--brand-500, #6366f1)' }}
      />
    );
  }
  return (
    <h2
      className="text-xl font-bold cursor-text"
      style={{ color: 'var(--ink-1)' }}
      onClick={() => setEditing(true)}
    >
      {value}
    </h2>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i === value ? 0 : i)}
          className="p-0.5"
        >
          <Star
            className="w-3.5 h-3.5"
            style={{
              color: i <= display ? '#f59e0b' : 'var(--ink-3)',
              fill: i <= display ? '#f59e0b' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  );
}

function StatusButton({
  active, onClick, icon: Icon, label, activeBg, activeFg,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  activeBg: string;
  activeFg: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? activeBg : 'transparent',
        color: active ? activeFg : 'var(--ink-2)',
        border: `1px solid ${active ? activeBg : 'var(--edge)'}`,
      }}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function SidebarCard({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
    >
      <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-1)' }}>{title}</h4>
      {children}
    </div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'rgba(99,102,241,0.1)',
        color: 'var(--brand-500, #6366f1)',
      }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function InlineResponsavel({
  label, users, value, onSave,
}: {
  label: string;
  users: User[];
  value: string | null;
  onSave: (id: string | null) => Promise<unknown> | void;
}) {
  const [editing, setEditing] = useState(false);
  const current = users.find((u) => u.id === value) ?? null;

  if (editing) {
    return (
      <div className="grid items-center gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{label}</div>
        <select
          autoFocus
          value={value ?? ''}
          onChange={async (e) => {
            await onSave(e.target.value || null);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          className="px-2 py-1 rounded text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--brand-500, #6366f1)', color: 'var(--ink-1)' }}
        >
          <option value="">Sem responsável</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="grid items-center gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
      <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{label}</div>
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-left text-sm"
        style={{ color: current ? 'var(--ink-1)' : 'var(--brand-500, #6366f1)' }}
      >
        {current ? (
          <>
            <Avatar name={current.name} id={current.id} size={22} />
            {current.name}
          </>
        ) : (
          'Adicionar'
        )}
      </button>
    </div>
  );
}

function AddressRow({ contact }: { contact: Lead['contact'] }) {
  if (!contact) return null;
  const parts = [contact.rua, contact.numero, contact.bairro, contact.cidade, contact.estado].filter(Boolean);
  const address = parts.join(', ');
  return (
    <div className="grid items-start gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
      <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Endereço</div>
      <div className="text-sm" style={{ color: address ? 'var(--ink-1)' : 'var(--ink-3)' }}>
        {address || 'Nenhum endereço registrado'}
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
        style={{ background: 'var(--surface-hover)' }}
      >
        <Clock className="w-10 h-10" style={{ color: 'var(--ink-3)' }} />
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>Nenhuma atividade registrada</div>
      <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
        Que tal agendar uma ligação para evoluir este negócio?
      </div>
    </div>
  );
}

function ActivityItem({ activity, users }: { activity: LeadActivity; users: User[] }) {
  const author = users.find((u) => u.id === activity.createdById) ?? activity.createdBy ?? null;
  const typeMeta: Record<ActivityType, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
    note:     { label: 'Nota',     icon: StickyNote },
    call:     { label: 'Ligação',  icon: PhoneCall },
    whatsapp: { label: 'WhatsApp', icon: MessageSquare },
    meeting:  { label: 'Reunião',  icon: UsersIcon },
    visit:    { label: 'Visita',   icon: MapPin },
    proposal: { label: 'Proposta', icon: FileText },
  };
  const meta = typeMeta[activity.type];
  const Icon = meta.icon;
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'var(--surface-hover)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--ink-2)' }} />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>{meta.label}</span>
        {author && <span className="text-xs" style={{ color: 'var(--ink-3)' }}>• {author.name}</span>}
        <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>{formatDateTime(activity.createdAt)}</span>
      </div>
      <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink-1)' }}>{activity.body}</div>
    </div>
  );
}
