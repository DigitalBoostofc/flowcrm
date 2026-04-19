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
import { useToastStore } from '@/store/toast.store';

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
  const pushToast = useToastStore((s) => s.push);
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
    onError: (err: any) => {
      if (snapshotRef.current) {
        qc.setQueryData<Lead[]>(['negocios'], snapshotRef.current);
      }
      // eslint-disable-next-line no-console
      console.error('[NegocioKanban] moveLead failed', err?.response?.status, err?.response?.data, err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.message || 'Falha desconhecida';
      pushToast({
        title: `Erro ao mover negócio${status ? ` (${status})` : ''}`,
        body: String(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg),
      });
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
      {/* gap-2.5 e colunas de 200px para caber mais na tela */}
      <div className="flex gap-2.5 overflow-x-auto pb-3" style={{ minHeight: 'calc(100vh - 200px)' }}>
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
    <div className="flex-shrink-0 flex flex-col" style={{ width: 210 }}>
      {/* Header compacto */}
      <div className="px-1 pb-1.5">
        <div
          className="text-[11px] font-semibold uppercase tracking-wider truncate"
          style={{ color: 'var(--ink-2)' }}
        >
          {stage.name}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {leads.length} · {formatBRL(total)}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-lg p-1.5 space-y-1.5 transition-all"
        style={{
          background: isOver ? 'rgba(99,91,255,0.08)' : 'rgba(99,91,255,0.03)',
          border: `1px ${isOver ? 'solid' : 'dashed'} ${isOver ? 'var(--brand-500)' : 'var(--edge)'}`,
          minHeight: 'calc(100vh - 240px)',
        }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <NegocioCard key={lead.id} lead={lead} onClick={() => onCardClick(lead.id)} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div
            className="flex items-center justify-center text-center text-[11px] px-3"
            style={{ color: 'var(--ink-3)', minHeight: 80 }}
          >
            {isDragging ? 'Solte aqui' : 'Vazio'}
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
    lead.status === 'won' ? 'rgba(0,192,127,0.06)'
    : lead.status === 'lost' ? 'rgba(229,72,77,0.05)'
    : 'var(--surface)';

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: statusBg, border: '1px solid var(--edge)', boxShadow: 'var(--shadow-sm)' }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className="cursor-grab active:cursor-grabbing rounded-md p-2 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium leading-snug" style={{ color: 'var(--ink-1)' }}>
            {title}
          </div>
          {lead.contact?.name && lead.title && (
            <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>
              {lead.contact.name}
            </div>
          )}
          {lead.value ? (
            <div className="text-[11px] mt-0.5 font-semibold font-mono" style={{ color: 'var(--brand-500)' }}>
              {formatBRL(Number(lead.value))}
            </div>
          ) : null}
        </div>
        {isStale && (
          <span
            className="flex items-center justify-center w-4 h-4 rounded flex-shrink-0"
            style={{ background: 'rgba(229,72,77,0.1)' }}
            title="Parado há +7 dias"
          >
            <AlertTriangle className="w-2.5 h-2.5" style={{ color: 'var(--danger)' }} />
          </span>
        )}
      </div>
    </div>
  );
}
