import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, DollarSign, Users, MapPin, Calendar, Edit2, Check, X, Archive, ArchiveRestore } from 'lucide-react';
import { getLead, updateLead, archiveLead, unarchiveLead } from '@/api/leads';
import { formatBRL } from '@/lib/format';
import StageProgress from './StageProgress';
import StatusToggle from './StatusToggle';
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
        className="text-sm text-slate-100 hover:text-brand-400 text-left w-full flex items-center gap-1 group"
      >
        <span className={value ? '' : 'text-slate-500 italic'}>{value || placeholder || '—'}</span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
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
        className="flex-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none"
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-emerald-400 hover:text-emerald-300">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300">
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

  if (isLoading || !lead) return <div className="text-slate-500 text-sm p-4">Carregando...</div>;

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
      <div className="text-slate-500 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-sm text-slate-100">{value ?? <span className="text-slate-600">—</span>}</div>
      </div>
    </div>
  );

  const pipelineStages = stages.length > 0 ? stages : (lead.pipeline?.stages ?? []);

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
        <div className="mb-1">
          <InlineEdit
            value={lead.title ?? ''}
            placeholder={lead.contact?.name ?? 'Título do negócio'}
            onSave={(v) => mutation.mutate({ title: v })}
          />
        </div>
        <p className="text-xs text-slate-500">
          {lead.contact?.name} · {lead.pipeline?.name}
        </p>
      </div>

      <div className="px-4 py-3 border-b border-slate-700/50">
        <StatusToggle lead={lead} />
        {lead.status === 'lost' && lead.lossReason && (
          <p className="text-xs text-red-400/80 mt-2 pl-1">Motivo: {lead.lossReason}</p>
        )}
      </div>

      <div className="px-4 pb-3 border-b border-slate-700/50">
        <button
          onClick={() => archiveMutation.mutate()}
          disabled={archiveMutation.isPending}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            lead.archivedAt
              ? 'text-brand-400 border-brand-400/30 hover:bg-brand-400/10'
              : 'text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-600'
          }`}
        >
          {lead.archivedAt ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          {lead.archivedAt ? 'Desarquivar lead' : 'Arquivar lead'}
        </button>
      </div>

      {pipelineStages.length > 0 && (
        <StageProgress lead={lead} stages={pipelineStages} />
      )}

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
        {row(
          <MapPin className="w-4 h-4" />,
          'Origem',
          lead.contact?.origin ?? <span className="text-slate-600">—</span>,
        )}
        {row(<Users className="w-4 h-4" />, 'Agente responsável', lead.assignedTo?.name)}
      </div>
    </div>
  );
}
