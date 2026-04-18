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
      className="w-68 flex-shrink-0 flex flex-col max-h-full rounded-xl overflow-hidden glass transition-all duration-200"
      style={{
        minWidth: '272px',
        boxShadow: isOver ? `0 0 0 2px ${stage.color}60, var(--shadow-card)` : undefined,
      }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--edge)',
          borderTop: `2px solid ${stage.color}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--ink-1)' }}>{stage.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--edge)', color: 'var(--ink-2)' }}
          >
            {leads.length}
          </span>
          {total > 0 && (
            <span className="text-xs font-mono text-brand-500 font-medium">{formatBRL(total)}</span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="p-2 space-y-1.5 overflow-y-auto flex-1 transition-colors duration-150"
        style={{
          minHeight: '140px',
          background: isOver ? `${stage.color}06` : undefined,
        }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (<LeadCard key={lead.id} lead={lead} />))}
        </SortableContext>
        {leads.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed gap-2 transition-colors duration-150"
            style={{
              borderColor: isOver ? `${stage.color}60` : 'var(--edge)',
            }}
          >
            <div className="w-6 h-6 rounded-full" style={{ background: `${stage.color}20` }}>
              <div className="w-full h-full rounded-full" style={{ background: stage.color, opacity: 0.4 }} />
            </div>
            <p className="text-xs select-none font-medium" style={{ color: 'var(--ink-3)' }}>
              {isOver ? 'Solte aqui' : 'Sem leads'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
