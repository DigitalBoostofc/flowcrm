import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Star, MoreHorizontal, Plus, Mail, Phone, MessageSquare, FileText,
  PhoneCall, Users as UsersIcon, MapPin, StickyNote, Clock, Check,
  Copy, Pin, HelpCircle, ChevronRight, ChevronDown, Tag, Trash2,
} from 'lucide-react';
import type { Lead, LeadStatus, LeadActivity, ActivityType, Pipeline, User, Stage } from '@/types/api';
import { updateLead, updateLeadStatus, moveLead, deleteLead } from '@/api/leads';
import { updateContact } from '@/api/contacts';
import { updateCompany } from '@/api/companies';
import { getLeadActivities, createLeadActivity, updateLeadActivity, completeLeadActivity, deleteLeadActivity } from '@/api/lead-activities';
import { listCustomerOrigins } from '@/api/customer-origins';
import { listLossReasons } from '@/api/loss-reasons';
import Avatar from '@/components/ui/Avatar';
import LabelPicker from '@/components/labels/LabelPicker';
import { StatusDropdown } from '@/components/negocios/StatusDropdown';

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

/* ── Inline select field ─────────────────────────────── */

function InlineSelect<T extends string>({
  label, value, options, placeholder = 'Sem origem', onChange,
}: {
  label: string;
  value: T | null | undefined;
  options: { id: T; name: string }[];
  placeholder?: string;
  onChange: (id: T | null) => void;
}) {
  return (
    <div className="grid items-center gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
      <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{label}</div>
      <select
        className="text-sm bg-transparent outline-none cursor-pointer"
        style={{ color: value ? 'var(--ink-1)' : 'var(--brand-500, #6366f1)' }}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value as T) || null)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
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
  active:  'Em andamento',
  won:     'Ganho',
  lost:    'Perdido',
  frozen:  'Congelado',
};

/* ── Main panel ──────────────────────────────────────── */

export interface NegocioDetailPanelProps {
  lead: Lead;
  currentUser: User | null;
  users: User[];
  pipelines: Pipeline[];
  onClose: () => void;
  onPipelineMoved?: (newPipelineId: string) => void;
}

export default function NegocioDetailPanel({ lead, currentUser, users, pipelines, onClose, onPipelineMoved }: NegocioDetailPanelProps) {
  const qc = useQueryClient();
  const [composerType, setComposerType] = useState<ComposerType>('note');
  const [activityText, setActivityText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [subTab, setSubTab] = useState<'historico' | 'fixadas'>('historico');
  const [copied, setCopied] = useState(false);
  const [pipelinePickerOpen, setPipelinePickerOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const pipelineBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

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

  const { data: customerOrigins = [] } = useQuery({
    queryKey: ['customer-origins'],
    queryFn: listCustomerOrigins,
  });

  const { data: lossReasons = [] } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: listLossReasons,
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
    mutationFn: ({ status, extra }: { status: LeadStatus; extra?: { lossReason?: string; freezeReason?: string; frozenReturnDate?: string } }) =>
      updateLeadStatus(lead.id, status, extra),
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
    onSuccess: (_, newPipelineId) => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      setPipelinePickerOpen(false);
      onPipelineMoved?.(newPipelineId);
      setSelectedPipelineId('');
    },
  });

  const contactMut = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string | null }) => {
      if (!lead.contactId) throw new Error('Negócio sem pessoa vinculada');
      return updateContact(lead.contactId, { [field]: value ?? undefined } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['pessoas'] });
    },
  });

  const companyMut = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string | null }) => {
      if (!lead.companyId) throw new Error('Negócio sem empresa vinculada');
      return updateCompany(lead.companyId, { [field]: value ?? undefined } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['empresas'] });
    },
  });

  const activityMut = useMutation({
    mutationFn: (data: { type: ActivityType; body: string; scheduledAt?: string }) =>
      createLeadActivity(lead.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', lead.id] });
      setActivityText('');
      setScheduledAt('');
    },
  });

  const completeActivityMut = useMutation({
    mutationFn: (id: string) => completeLeadActivity(lead.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-activities', lead.id] }),
  });

  const deleteActivityMut = useMutation({
    mutationFn: (id: string) => deleteLeadActivity(lead.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-activities', lead.id] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteLead(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      onClose();
    },
  });

  const sendActivity = () => {
    const body = activityText.trim();
    if (!body) return;
    const type: ActivityType = composerType === 'note' ? 'note' : composerType;
    activityMut.mutate({ type, body, scheduledAt: scheduledAt || undefined });
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
              <LeadLabelsRow lead={lead} />
              {assignedTo && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                  <Avatar name={assignedTo.name} url={assignedTo.avatarUrl} size={20} />
                  {assignedTo.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusDropdown
              lead={lead}
              lossReasons={lossReasons}
              onUpdate={(_id, status, extra) => statusMut.mutate({ status, extra })}
            />
            <div className="relative">
              <button
                ref={moreBtnRef}
                onClick={() => setMoreMenuOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--ink-2)' }}
                title="Mais opções"
              >
                <MoreHorizontal className="w-4 h-4" /> Mais opções
              </button>
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[200]" onClick={() => setMoreMenuOpen(false)} />
                  <div
                    className="absolute right-0 mt-1 rounded-xl shadow-xl z-[201] py-1 min-w-[200px]"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge-strong)' }}
                  >
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        if (confirm('Excluir este negócio permanentemente? Esta ação não pode ser desfeita.')) {
                          deleteMut.mutate();
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                      style={{ color: 'var(--danger, #ef4444)' }}
                    >
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                      Excluir negócio
                    </button>
                  </div>
                </>
              )}
            </div>
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
              <div className="flex-shrink-0" style={{ borderRight: '1px solid var(--edge)' }}>
                <button
                  ref={pipelineBtnRef}
                  onClick={() => {
                    if (!pipelinePickerOpen && pipelineBtnRef.current) {
                      const rect = pipelineBtnRef.current.getBoundingClientRect();
                      setPickerPos({ top: rect.bottom + 6, left: rect.left });
                    }
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
              </div>

              {pipelinePickerOpen && (
                <>
                  <div className="fixed inset-0 z-[200]" onClick={() => setPipelinePickerOpen(false)} />
                  <div
                    className="rounded-xl shadow-xl z-[201] min-w-[220px] py-2"
                    style={{
                      position: 'fixed',
                      top: pickerPos.top,
                      left: pickerPos.left,
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--edge-strong)',
                      boxShadow: 'var(--shadow-xl)',
                    }}
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
              {stages.map((s, idx) => {
                const isCurrent = idx === currentStageIdx;
                const isPast = idx < currentStageIdx;
                const isDone = isPast || isCurrent;
                return (
                  <div key={s.id} className="flex-1 flex items-stretch min-w-0">
                    <button
                      onClick={() => !isCurrent && stageMut.mutate(s.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-all min-w-0"
                      style={{
                        background: isCurrent
                          ? '#22c55e'
                          : isPast
                            ? '#16a34a'
                            : 'transparent',
                        color: isDone ? '#fff' : 'var(--ink-3)',
                        boxShadow: isCurrent ? '0 0 12px rgba(34,197,94,0.55), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                        cursor: isCurrent ? 'default' : 'pointer',
                      }}
                    >
                      {isPast && <Check className="w-3 h-3 flex-shrink-0 opacity-80" strokeWidth={3} />}
                      <span className="truncate">{s.name}</span>
                      {isCurrent && (
                        <span className="flex items-center gap-0.5 text-[10px] opacity-80 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {timeInStage(lead.stageEnteredAt)}
                        </span>
                      )}
                    </button>
                    {idx < stages.length - 1 && (
                      <div
                        className="flex items-center justify-center flex-shrink-0 w-5"
                        style={{
                          background: isPast ? '#16a34a' : isCurrent ? '#22c55e' : 'transparent',
                          clipPath: 'polygon(0 0, 70% 0, 100% 50%, 70% 100%, 0 100%, 30% 50%)',
                        }}
                      >
                        <ChevronRight
                          className="w-3 h-3"
                          style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)', marginLeft: 4 }}
                        />
                      </div>
                    )}
                  </div>
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
                <div className="flex items-center justify-between mt-2 gap-2">
                  {composerType !== 'note' && (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="text-xs outline-none bg-transparent flex-1"
                        style={{ color: 'var(--ink-2)' }}
                      />
                    </div>
                  )}
                  <button
                    onClick={sendActivity}
                    disabled={!activityText.trim() || activityMut.isPending}
                    className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
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
                  <ActivityItem
                    key={a.id}
                    activity={a}
                    users={users}
                    onComplete={() => completeActivityMut.mutate(a.id)}
                    onDelete={() => deleteActivityMut.mutate(a.id)}
                  />
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
                <InlineSelect
                  label="Origem"
                  value={lead.customerOriginId}
                  options={customerOrigins}
                  onChange={(id) => leadMut.mutate({ customerOriginId: id })}
                  placeholder={customerOrigins.length === 0 ? 'Cadastre origens nas configurações' : 'Selecionar'}
                />
              </div>
            </SidebarCard>

            {/* Dados da empresa vinculada */}
            {lead.company && (
              <SidebarCard title="Dados da empresa">
                <div
                  className="flex items-center gap-2 p-2 rounded-md mb-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <Avatar name={lead.company.name} url={(lead.company as any).avatarUrl} size={28} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>
                    {lead.company.name}
                  </span>
                </div>
                <div className="space-y-0">
                  <InlineField
                    label="Email"
                    type="email"
                    value={(lead.company as any).email ?? ''}
                    onSave={(v) => companyMut.mutateAsync({ field: 'email', value: v || null })}
                  />
                  <InlineField
                    label="WhatsApp"
                    type="tel"
                    value={(lead.company as any).whatsapp ?? ''}
                    onSave={(v) => companyMut.mutateAsync({ field: 'whatsapp', value: v || null })}
                  />
                  <InlineField
                    label="Celular"
                    type="tel"
                    value={(lead.company as any).celular ?? ''}
                    onSave={(v) => companyMut.mutateAsync({ field: 'celular', value: v || null })}
                  />
                  <InlineField
                    label="Telefone"
                    type="tel"
                    value={(lead.company as any).telefone ?? ''}
                    onSave={(v) => companyMut.mutateAsync({ field: 'telefone', value: v || null })}
                  />
                  <InlineField
                    label="Site"
                    value={(lead.company as any).website ?? ''}
                    onSave={(v) => companyMut.mutateAsync({ field: 'website', value: v || null })}
                  />
                </div>
              </SidebarCard>
            )}

            {/* Dados da pessoa vinculada */}
            {lead.contact && (
              <SidebarCard title="Dados da pessoa">
                <div
                  className="flex items-center gap-2 p-2 rounded-md mb-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <Avatar name={lead.contact.name} url={lead.contact.avatarUrl} size={28} />
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

function LeadLabelsRow({ lead }: { lead: Lead }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labels = lead.labels ?? [];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {labels.map((l) => (
        <span
          key={l.id}
          className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold text-white"
          style={{ background: l.color }}
          title={l.name}
        >
          {l.name}
        </span>
      ))}
      <button
        ref={btnRef}
        onClick={() => setPickerOpen((o) => !o)}
        className="flex items-center gap-1 h-5 px-1.5 rounded-full text-[11px] transition-colors hover:bg-[var(--surface-hover)]"
        style={{ border: '1px dashed var(--edge-strong)', color: 'var(--ink-3)' }}
        title="Gerenciar etiquetas"
      >
        <Tag className="w-3 h-3" />
        {labels.length === 0 && <span>Etiqueta</span>}
      </button>
      {pickerOpen && (
        <LabelPicker
          leadId={lead.id}
          leadLabels={labels}
          pipelineId={lead.pipelineId ?? undefined}
          onClose={() => setPickerOpen(false)}
          anchorRef={btnRef}
        />
      )}
    </div>
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
            <Avatar name={current.name} url={current.avatarUrl} size={22} />
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

const ACTIVITY_META: Record<ActivityType, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  note:     { label: 'Nota',     icon: StickyNote },
  call:     { label: 'Ligação',  icon: PhoneCall },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare },
  meeting:  { label: 'Reunião',  icon: UsersIcon },
  visit:    { label: 'Visita',   icon: MapPin },
  proposal: { label: 'Proposta', icon: FileText },
};

function ActivityItem({
  activity, users, onComplete, onDelete,
}: {
  activity: LeadActivity;
  users: User[];
  onComplete: () => void;
  onDelete: () => void;
}) {
  const author = users.find((u) => u.id === activity.createdById) ?? activity.createdBy ?? null;
  const meta = ACTIVITY_META[activity.type];
  const Icon = meta.icon;
  const isScheduled = !!activity.scheduledAt && !activity.completedAt;
  const isCompleted = !!activity.completedAt;
  const isOverdue = isScheduled && new Date(activity.scheduledAt!) < new Date();

  return (
    <div
      className="p-3 rounded-lg"
      style={{
        background: isCompleted ? 'var(--surface)' : 'var(--surface)',
        border: `1px solid ${isOverdue ? '#fca5a5' : 'var(--edge)'}`,
        opacity: isCompleted ? 0.7 : 1,
      }}
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
        <button
          onClick={onDelete}
          className="p-0.5 rounded hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--ink-3)' }}
          title="Excluir"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink-1)' }}>{activity.body}</div>

      {(isScheduled || isCompleted) && (
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--edge)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: isOverdue ? '#ef4444' : 'var(--ink-3)' }}>
            <Clock className="w-3 h-3" />
            {isCompleted
              ? `Finalizada em ${formatDateTime(activity.completedAt!)}`
              : `Agendada para ${formatDateTime(activity.scheduledAt!)}`}
          </div>
          {isScheduled && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
            >
              <Check className="w-3 h-3" /> Finalizar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
