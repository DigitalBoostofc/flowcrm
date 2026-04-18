import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, DragEndEvent, DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { Stage, Lead } from '@/types/api';
import KanbanColumn from './KanbanColumn';
import { moveLead } from '@/api/leads';

interface Props {
  stages: Stage[];
  leadsByStage: Record<string, Lead[]>;
  pipelineId: string | null;
}

// Track recently moved leads by this client to ignore echoed WS events
const recentMoves = new Map<string, number>();
export function wasRecentlyMoved(leadId: string): boolean {
  const t = recentMoves.get(leadId);
  if (!t) return false;
  if (Date.now() - t > 2000) {
    recentMoves.delete(leadId);
    return false;
  }
  return true;
}

export default function KanbanBoard({ stages, leadsByStage, pipelineId }: Props) {
  const queryClient = useQueryClient();
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const snapshotRef = useRef<Lead[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const mutation = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => moveLead(id, stageId),
    onError: () => {
      if (snapshotRef.current && pipelineId) {
        queryClient.setQueryData(['leads', pipelineId], snapshotRef.current);
      }
    },
    onSettled: () => {
      snapshotRef.current = null;
    },
  });

  const handleDragStart = (evt: DragStartEvent) => {
    setActiveId(String(evt.active.id));
  };

  const handleDragEnd = (evt: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = evt;
    if (!over || !pipelineId) return;

    const activeLeadId = String(active.id);
    const overId = String(over.id);
    // When dropping over a column, overId is 'stage-<uuid>'. When over a card, it's the leadId.
    let targetStageId: string | null = null;
    if (overId.startsWith('stage-')) {
      targetStageId = overId.replace('stage-', '');
    } else {
      // dropped over another lead card → find that card's stageId
      const stages = Object.entries(leadsByStage);
      for (const [stageId, leads] of stages) {
        if (leads.find((l) => l.id === overId)) {
          targetStageId = stageId;
          break;
        }
      }
    }
    if (!targetStageId) return;

    const allLeads = Object.values(leadsByStage).flat();
    const lead = allLeads.find((l) => l.id === activeLeadId);
    if (!lead || lead.stageId === targetStageId) return;

    // Optimistic update
    snapshotRef.current = allLeads;
    recentMoves.set(activeLeadId, Date.now());

    queryClient.setQueryData<Lead[]>(['leads', pipelineId], (old = []) =>
      old.map((l) => (l.id === activeLeadId ? { ...l, stageId: targetStageId! } : l)),
    );

    mutation.mutate({ id: activeLeadId, stageId: targetStageId });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Movendo lead ${active.id}`,
          onDragOver: ({ over }) => over ? `Sobre ${over.id}` : '',
          onDragEnd: ({ over }) => over ? `Movido para ${over.id}` : 'Cancelado',
          onDragCancel: () => 'Cancelado',
        },
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {sortedStages.map((s) => (
          <KanbanColumn key={s.id} stage={s} leads={leadsByStage[s.id] ?? []} />
        ))}
      </div>
    </DndContext>
  );
}
