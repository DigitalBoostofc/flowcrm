import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Stage, Lead } from '@/types/api';
import LeadCard from './LeadCard';
import { formatBRL } from '@/lib/format';

interface Props {
  stage: Stage;
  leads: Lead[];
}

export default function KanbanColumn({ stage, leads }: Props) {
  const total = leads.reduce((sum, l) => sum + Number(l.value ?? 0), 0);
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stageId: stage.id },
  });

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
      <div
        ref={setNodeRef}
        className={`p-2 space-y-2 overflow-y-auto flex-1 min-h-[120px] transition-colors ${isOver ? 'bg-slate-700/40' : ''}`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (<LeadCard key={lead.id} lead={lead} />))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-6">Solte aqui</div>
        )}
      </div>
    </div>
  );
}
