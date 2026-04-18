import type { Stage, Lead } from '@/types/api';
import KanbanColumn from './KanbanColumn';

interface Props {
  stages: Stage[];
  leadsByStage: Record<string, Lead[]>;
}

export default function KanbanBoard({ stages, leadsByStage }: Props) {
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
      {sortedStages.map((s) => (
        <KanbanColumn key={s.id} stage={s} leads={leadsByStage[s.id] ?? []} />
      ))}
    </div>
  );
}
