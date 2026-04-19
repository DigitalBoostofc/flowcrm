import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, DragEndEvent, DragStartEvent, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Lead, Pipeline, Stage } from '@/types/api';
import { moveLead } from '@/api/leads';
import { formatBRL } from '@/lib/format';

interface Props {
  pipeline: Pipeline | null;
  leads: Lead[];
  onCardClick: (leadId: string) => void;
}

function daysSinceUpdate(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function NegocioKanban({ pipeline, leads, onCardClick }: Props) {
  const qc = useQueryClient();
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const snapshotRef = useRef<Lead[] | null>(null);

  const stages: Stage[] = useMemo(
    () => (pipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position),
    [pipeline],
  );

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const l of leads) {
      if (map[l.stageId]) map[l.stageId].push(l);
    }
    return map;
  }, [stages, leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const mutation = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => moveLead(id, stageId),
    onError: () => {
      if (snapshotRef.current) {
        qc.setQueryData<Lead[]>(['negocios'], snapshotRef.current);
      }
    },
    onSettled: () => {
      snapshotRef.current = null;
      qc.invalidateQueries({ queryKey: ['negocios'] });
    },
  });

  const handleDragStart = (evt: DragStartEvent) => setActiveLeadId(String(evt.active.id));

  const handleDragEnd = (evt: DragEndEvent) => {
    setActiveLeadId(null);
    const { active, over } = evt;
    if (!over) return;

    const leadId = String(active.id);
    const overId = String(over.id);
    let targetStageId: string | null = null;
    if (overId.startsWith('stage-')) targetStageId = overId.replace('stage-', '');
    else {
      for (const [stageId, leadList] of Object.entries(leadsByStage)) {
        if (leadList.find((l) => l.id === overId)) {
          targetStageId = stageId;
          break;
        }
      }
    }
    if (!targetStageId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stageId === targetStageId) return;

    snapshotRef.current = leads;
    qc.setQueryData<Lead[]>(['negocios'], (old = []) =>
      old.map((l) => (l.id === leadId ? { ...l, stageId: targetStageId! } : l)),
    );
    mutation.mutate({ id: leadId, stageId: targetStageId });
  };

  if (!pipeline || stages.length === 0) {
    return (
      <div
        className="rounded-xl p-10 text-center text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
      >
        Este funil não possui etapas configuradas.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {stages.map((s) => (
          <NegocioColumn
            key={s.id}
            stage={s}
            leads={leadsByStage[s.id] ?? []}
            onCardClick={onCardClick}
            isDragging={!!activeLeadId}
          />
        ))}
      </div>
    </DndContext>
  );
}

/* ── Column ──────────────────────────────────────────── */

function NegocioColumn({
  stage, leads, onCardClick, isDragging,
}: {
  stage: Stage;
  leads: Lead[];
  onCardClick: (leadId: string) => void;
  isDragging: boolean;
}) {
  const total = leads.reduce((sum, l) => sum + Number(l.value ?? 0), 0);
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stageId: stage.id },
  });

  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: 280 }}>
      {/* Header */}
      <div className="px-1 pb-2">
        <div
          className="text-xs font-bold uppercase tracking-wide mb-0.5"
          style={{ color: 'var(--ink-2)' }}
        >
          {stage.name}
        </div>
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {leads.length} · {formatBRL(total)}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-lg p-2 space-y-2 transition-all"
        style={{
          background: isOver ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
          border: `1px ${isOver ? 'solid' : 'dashed'} ${isOver ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
          minHeight: 440,
        }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <NegocioCard key={lead.id} lead={lead} onClick={() => onCardClick(lead.id)} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div
            className="flex items-center justify-center h-full text-center text-xs px-4"
            style={{ color: 'var(--ink-3)', minHeight: 380 }}
          >
            {isDragging
              ? 'Solte aqui'
              : (
                <span>
                  Arraste para cá,<br />
                  para adicionar negócios<br />
                  nessa etapa
                </span>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Card ────────────────────────────────────────────── */

function NegocioCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const title = lead.title ?? lead.contact?.name ?? 'Sem título';
  const isStale = lead.status === 'active' && lead.updatedAt
    ? daysSinceUpdate(lead.updatedAt) >= 7
    : false;

  const statusBg =
    lead.status === 'won' ? 'rgba(16,185,129,0.07)'
    : lead.status === 'lost' ? 'rgba(239,68,68,0.05)'
    : 'var(--surface-raised)';

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: statusBg }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className="cursor-grab active:cursor-grabbing rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink-1)' }}>
            {title}
          </div>
          {lead.contact?.name && lead.title && (
            <div className="text-xs mt-1 truncate" style={{ color: 'var(--ink-3)' }}>
              {lead.contact.name}
            </div>
          )}
          {lead.value ? (
            <div className="text-xs mt-1 font-mono font-semibold" style={{ color: 'var(--brand-500, #6366f1)' }}>
              {formatBRL(Number(lead.value))}
            </div>
          ) : null}
        </div>
        {isStale && (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
            style={{ background: '#fee2e2' }}
            title="Negócio parado há mais de 7 dias"
          >
            <AlertTriangle className="w-3 h-3" style={{ color: '#dc2626' }} />
          </span>
        )}
      </div>
    </div>
  );
}
