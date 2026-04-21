import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, DollarSign, Users, MapPin, Calendar, Edit2, Check, X, Archive, ArchiveRestore } from 'lucide-react';
import { getLead, updateLead, archiveLead, unarchiveLead } from '@/api/leads';
import { formatBRL } from '@/lib/format';
import StageProgress from './StageProgress';
import StatusToggle from './StatusToggle';
import { LeadInfoSkeleton } from '@/components/ui/Skeleton';
import type { Lead, Stage } from '@/types/api';

interface Props {
  leadId: string;
  stages?: Stage[];
}

function InlineEdit({
  value,
  onSave,
  placeholder,
  type = 'text',
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="text-sm text-left w-full flex items-center gap-1 group transition-colors duration-150"
        style={{ color: 'var(--ink-1)' }}
        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = '#f59e0b'}
        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-1)'}
      >
        <span style={!value ? { color: 'var(--ink-3)', fontStyle: 'italic' } : {}}>
          {value || placeholder || '—'}
        </span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-40 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSave(draft); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="flex-1 px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          color: 'var(--ink-1)',
        }}
      />
      <button
        onClick={() => { onSave(draft); setEditing(false); }}
        className="p-1 rounded text-emerald-500 hover:text-emerald-400 transition-colors"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="p-1 rounded transition-colors"
        style={{ color: 'var(--ink-3)' }}
        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-2)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function LeadInfo({ leadId, stages = [] }: Props) {
  const qc = useQueryClient();
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId),
  });

  const mutation = useMutation({
    mutationFn: (data: { title?: string; value?: number; startDate?: string; conclusionDate?: string }) =>
      updateLead(leadId, data),
    onSuccess: (updated) => {
      qc.setQueryData<Lead>(['lead', leadId], updated);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => lead?.archivedAt ? unarchiveLead(leadId) : archiveLead(leadId),
    onSuccess: (updated) => {
      qc.setQueryData<Lead>(['lead', leadId], updated);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  if (isLoading || !lead) return <LeadInfoSkeleton />;

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div
      className="flex items-start gap-3 py-3 last:border-0"
      style={{ borderBottom: '1px solid var(--panel-border)' }}
    >
      <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--ink-3)' }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--ink-3)' }}
        >
          {label}
        </div>
        <div className="text-sm" style={{ color: 'var(--ink-1)' }}>
          {value ?? <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </div>
      </div>
    </div>
  );

  const pipelineStages = stages.length > 0 ? stages : (lead.pipeline?.stages ?? []);

  return (
    <div className="flex flex-col animate-fade-up">
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <div className="mb-1">
          <InlineEdit
            value={lead.title ?? ''}
            placeholder={lead.contact?.name ?? 'Título do negócio'}
            onSave={(v) => mutation.mutate({ title: v })}
          />
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
          {lead.contact?.name}
          {lead.pipeline?.name && <> · {lead.pipeline.name}</>}
        </p>
      </div>

      {/* Status */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <StatusToggle lead={lead} />
        {lead.status === 'lost' && lead.lossReason && (
          <p className="text-xs mt-2 pl-1" style={{ color: '#f87171' }}>Motivo: {lead.lossReason}</p>
        )}
        {lead.status === 'frozen' && (
          <div className="mt-2 pl-1 space-y-0.5">
            {lead.freezeReason && <p className="text-xs" style={{ color: '#0284c7' }}>❄ {lead.freezeReason}</p>}
            {lead.frozenReturnDate && <p className="text-xs" style={{ color: '#0284c7' }}>↩ Retorno: {new Date(lead.frozenReturnDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
          </div>
        )}
      </div>

      {/* Archive */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <button
          onClick={() => archiveMutation.mutate()}
          disabled={archiveMutation.isPending}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 disabled:opacity-50"
          style={
            lead.archivedAt
              ? { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'transparent' }
              : { color: 'var(--ink-3)', borderColor: 'var(--panel-border)', background: 'transparent' }
          }
          onMouseEnter={(e) => {
            if (!lead.archivedAt)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-2)';
          }}
          onMouseLeave={(e) => {
            if (!lead.archivedAt)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)';
          }}
        >
          {lead.archivedAt ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          {lead.archivedAt ? 'Desarquivar lead' : 'Arquivar lead'}
        </button>
      </div>

      {/* Stage progress */}
      {pipelineStages.length > 0 && (
        <StageProgress lead={lead} stages={pipelineStages} />
      )}

      {/* Fields */}
      <div className="px-4">
        {row(<Phone className="w-4 h-4" />, 'Telefone', lead.contact?.phone)}
        {row(<Mail className="w-4 h-4" />, 'Email', lead.contact?.email)}
        {row(
          <DollarSign className="w-4 h-4" />,
          'Valor',
          <InlineEdit
            value={lead.value != null ? String(lead.value) : ''}
            placeholder="0,00"
            type="number"
            onSave={(v) => mutation.mutate({ value: v ? parseFloat(v) : undefined })}
          />,
        )}
        {row(
          <Calendar className="w-4 h-4" />,
          'Data de conclusão',
          <InlineEdit
            value={lead.conclusionDate ?? ''}
            placeholder="AAAA-MM-DD"
            type="date"
            onSave={(v) => mutation.mutate({ conclusionDate: v || undefined })}
          />,
        )}
        {row(<MapPin className="w-4 h-4" />, 'Origem', lead.contact?.origin)}
        {row(<Users className="w-4 h-4" />, 'Agente responsável', lead.assignedTo?.name)}
      </div>
    </div>
  );
}
