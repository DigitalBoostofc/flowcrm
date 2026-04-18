import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, DollarSign, Users, Flag } from 'lucide-react';
import { getLead } from '@/api/leads';
import { formatBRL } from '@/lib/format';

export default function LeadInfo({ leadId }: { leadId: string }) {
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId),
  });

  if (isLoading || !lead) return <div className="text-slate-500 text-sm p-4">Carregando...</div>;

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
      <div className="text-slate-500 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm text-slate-100 mt-0.5 break-words">{value ?? '—'}</div>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-1">{lead.contact?.name ?? 'Lead'}</h2>
      <p className="text-xs text-slate-500 mb-4">
        {lead.pipeline?.name} • {lead.stage?.name}
      </p>
      {row(<Phone className="w-4 h-4" />, 'Telefone', lead.contact?.phone)}
      {row(<Mail className="w-4 h-4" />, 'Email', lead.contact?.email)}
      {row(<DollarSign className="w-4 h-4" />, 'Valor', formatBRL(lead.value))}
      {row(<Flag className="w-4 h-4" />, 'Etapa atual', lead.stage?.name)}
      {row(<Users className="w-4 h-4" />, 'Agente responsável', lead.assignedTo?.name)}
    </div>
  );
}
