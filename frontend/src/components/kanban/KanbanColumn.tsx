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
    <div
      className="w-68 flex-shrink-0 flex flex-col max-h-full rounded-xl overflow-hidden glass transition-shadow duration-150"
      style={{ minWidth: '272px', boxShadow: isOver ? `0 0 0 2px ${stage.color}55` : undefined }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--edge)',
          borderTop: `2px solid ${stage.color}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="font-medium text-sm" style={{ color: 'var(--ink-1)' }}>{stage.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>{leads.length}</span>
          {total > 0 && (
            <span className="text-xs font-mono text-brand-500">{formatBRL(total)}</span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`p-2 space-y-1.5 overflow-y-auto flex-1 min-h-[140px] transition-colors duration-150 ${
          isOver ? 'bg-brand-500/[0.04]' : ''
        }`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (<LeadCard key={lead.id} lead={lead} />))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs select-none" style={{ color: 'var(--ink-3)' }}>Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
