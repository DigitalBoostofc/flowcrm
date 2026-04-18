import type { Stage, Lead } from '@/types/api';
import LeadCard from './LeadCard';
import { formatBRL } from '@/lib/format';

interface Props {
  stage: Stage;
  leads: Lead[];
}

export default function KanbanColumn({ stage, leads }: Props) {
  const total = leads.reduce((sum, l) => sum + Number(l.value ?? 0), 0);

  return (
    <div className="w-72 flex-shrink-0 bg-slate-800 rounded-xl flex flex-col max-h-full">
      <div
        className="px-4 py-3 border-b border-slate-700 flex items-center justify-between"
        style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
      >
        <div>
          <div className="font-semibold text-sm text-slate-100">{stage.name}</div>
          <div className="text-xs text-slate-500">{leads.length} • {formatBRL(total)}</div>
        </div>
      </div>
      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-6">Nenhum lead</div>
        )}
      </div>
    </div>
  );
}
