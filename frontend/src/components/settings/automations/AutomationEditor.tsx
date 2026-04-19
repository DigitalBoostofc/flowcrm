import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Play, Pause, Zap, Clock, Filter, MessageCircle, Trash2, Plus, Pencil,
} from 'lucide-react';
import type {
  Automation, AutomationStep, AutomationStepType, AutomationTriggerType,
  WaitStepConfig, FilterStepConfig, SendWhatsappStepConfig,
} from '@/api/automations';
import { createAutomation, updateAutomation } from '@/api/automations';
import { listPipelines } from '@/api/pipelines';
import { listTemplates } from '@/api/templates';
import { listChannels } from '@/api/channels';
import StepConfigDrawer from './StepConfigDrawer';

interface Props {
  automation: Automation | null;
  onBack: () => void;
  onSaved: (a: Automation) => void;
}

const UNIT_LABEL: Record<WaitStepConfig['unit'], string> = {
  minutes: 'minuto(s)',
  hours: 'hora(s)',
  days: 'dia(s)',
};

export default function AutomationEditor({ automation, onBack, onSaved }: Props) {
  const qc = useQueryClient();
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });

  const [name, setName] = useState(automation?.name ?? 'Nova automação');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(automation?.triggerType ?? 'pipeline');
  const [pipelineId, setPipelineId] = useState<string>(automation?.pipelineId ?? '');
  const [stageId, setStageId] = useState<string>(automation?.stageId ?? '');
  const [active, setActive] = useState<boolean>(automation?.active ?? true);
  const [steps, setSteps] = useState<AutomationStep[]>(
    (automation?.steps ?? []).slice().sort((a, b) => a.position - b.position),
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<{ index: number | null; step: AutomationStep | null }>({
    index: null, step: null,
  });

  useEffect(() => {
    if (triggerType === 'stage' && stageId) {
      const stagePipeline = pipelines.find((p) => p.stages?.some((s) => s.id === stageId));
      if (stagePipeline && !pipelineId) setPipelineId(stagePipeline.id);
    }
  }, [stageId, pipelines, triggerType, pipelineId]);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId) ?? null;
  const stages = selectedPipeline?.stages ?? [];

  const saveMut = useMutation({
    mutationFn: async () => {
      const dto = {
        name: name.trim() || 'Nova automação',
        triggerType,
        pipelineId: triggerType === 'pipeline' ? pipelineId : null,
        stageId: triggerType === 'stage' ? stageId : null,
        active,
        steps: steps.map((s, i) => ({ position: i, type: s.type, config: s.config })),
      };
      return automation
        ? updateAutomation(automation.id, dto)
        : createAutomation(dto);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      onSaved(saved);
    },
  });

  const triggerValid =
    (triggerType === 'pipeline' && !!pipelineId) ||
    (triggerType === 'stage' && !!stageId);

  const handleAdd = (index: number) => {
    setEditing({ index, step: null });
    setDrawerOpen(true);
  };

  const handleEdit = (i: number) => {
    setEditing({ index: i, step: steps[i] });
    setDrawerOpen(true);
  };

  const handleRemove = (i: number) => {
    if (confirm('Remover este passo?')) {
      setSteps((prev) => prev.filter((_, idx) => idx !== i));
    }
  };

  const handleDrawerSave = (step: AutomationStep) => {
    setSteps((prev) => {
      const next = prev.slice();
      if (editing.step && editing.index !== null) {
        next[editing.index] = { ...step, position: editing.index };
      } else if (editing.index !== null) {
        next.splice(editing.index, 0, { ...step, position: editing.index });
      } else {
        next.push({ ...step, position: next.length });
      }
      return next.map((s, i) => ({ ...s, position: i }));
    });
    setDrawerOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-2 rounded-md hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-2)' }}
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 px-3 py-1.5 rounded-md outline-none text-lg font-bold"
            style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--ink-1)' }}
            onFocus={(e) => (e.currentTarget.style.border = '1px solid var(--edge)')}
            onBlur={(e) => (e.currentTarget.style.border = '1px solid transparent')}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActive((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: active ? 'rgba(16,185,129,0.1)' : 'var(--surface-hover)',
              color: active ? '#059669' : 'var(--ink-3)',
              border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'var(--edge)'}`,
            }}
          >
            {active ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {active ? 'Ativa' : 'Pausada'}
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!triggerValid || saveMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Save className="w-4 h-4" />
            {saveMut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0 pb-6">
        <TriggerCard
          triggerType={triggerType}
          pipelineId={pipelineId}
          stageId={stageId}
          pipelines={pipelines}
          stages={stages}
          onTriggerType={setTriggerType}
          onPipeline={setPipelineId}
          onStage={(sId) => {
            setStageId(sId);
            const stagePipeline = pipelines.find((p) => p.stages?.some((s) => s.id === sId));
            if (stagePipeline) setPipelineId(stagePipeline.id);
          }}
        />

        <Connector />
        <PlusBetween onClick={() => handleAdd(0)} disabled={steps.length > 0 && false} label={steps.length === 0 ? 'Adicionar primeiro passo' : undefined} />

        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center w-full">
            {i > 0 && (
              <>
                <Connector />
                <PlusBetween onClick={() => handleAdd(i)} />
              </>
            )}
            <Connector />
            <StepCard
              step={step}
              channels={channels}
              templates={templates}
              onEdit={() => handleEdit(i)}
              onRemove={() => handleRemove(i)}
            />
          </div>
        ))}

        {steps.length > 0 && (
          <>
            <Connector />
            <PlusBetween onClick={() => handleAdd(steps.length)} />
          </>
        )}

        <Connector short />
        <EndCard />
      </div>

      <StepConfigDrawer
        open={drawerOpen}
        initial={editing.step}
        onClose={() => setDrawerOpen(false)}
        onSave={handleDrawerSave}
      />
    </div>
  );
}

function TriggerCard({
  triggerType, pipelineId, stageId, pipelines, stages,
  onTriggerType, onPipeline, onStage,
}: {
  triggerType: AutomationTriggerType;
  pipelineId: string;
  stageId: string;
  pipelines: { id: string; name: string; stages?: { id: string; name: string }[] }[];
  stages: { id: string; name: string }[];
  onTriggerType: (t: AutomationTriggerType) => void;
  onPipeline: (id: string) => void;
  onStage: (id: string) => void;
}) {
  return (
    <div
      className="rounded-xl w-full max-w-xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}
        >
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
            Gatilho
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
            Quando...
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {(['pipeline', 'stage'] as const).map((t) => {
          const active = triggerType === t;
          return (
            <button
              key={t}
              onClick={() => onTriggerType(t)}
              className="flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: active ? 'var(--brand-500, #6366f1)' : 'var(--surface-raised, #fff)',
                color: active ? '#fff' : 'var(--ink-2)',
                border: `1px solid ${active ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
              }}
            >
              {t === 'pipeline' ? 'Entrar no funil' : 'Chegar em uma etapa'}
            </button>
          );
        })}
      </div>

      {triggerType === 'pipeline' ? (
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
            Funil
          </label>
          <select
            value={pipelineId}
            onChange={(e) => onPipeline(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
            <option value="">Selecione um funil...</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
              Funil
            </label>
            <select
              value={pipelineId}
              onChange={(e) => onPipeline(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            >
              <option value="">Selecione um funil...</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
              Etapa
            </label>
            <select
              value={stageId}
              onChange={(e) => onStage(e.target.value)}
              disabled={!pipelineId}
              className="w-full px-3 py-2 rounded-md text-sm outline-none disabled:opacity-50"
              style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            >
              <option value="">Selecione uma etapa...</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({
  step, channels, templates, onEdit, onRemove,
}: {
  step: AutomationStep;
  channels: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { icon: Icon, title, summary, accent } = describeStep(step, channels, templates);
  return (
    <div
      className="rounded-xl w-full max-w-xl p-4 flex items-start gap-3 group"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: accent.bg, color: accent.fg }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
          {title}
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
          {summary}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--ink-3)' }}
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md hover:bg-red-500/10"
          style={{ color: '#dc2626' }}
          title="Remover"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function describeStep(
  step: AutomationStep,
  channels: { id: string; name: string }[],
  templates: { id: string; name: string }[],
): {
  icon: typeof Clock;
  title: string;
  summary: string;
  accent: { bg: string; fg: string };
} {
  const stepType: AutomationStepType = step.type;
  if (stepType === 'wait') {
    const c = step.config as WaitStepConfig;
    return {
      icon: Clock,
      title: 'Tempo de espera',
      summary: `Aguardar ${c.amount ?? 0} ${UNIT_LABEL[c.unit ?? 'hours']}`,
      accent: { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
    };
  }
  if (stepType === 'filter') {
    const c = step.config as FilterStepConfig;
    const count = c.conditions?.length ?? 0;
    return {
      icon: Filter,
      title: 'Filtro',
      summary: count === 0
        ? 'Sem condições (configurar)'
        : `${count} condição${count > 1 ? 'ões' : ''} • ${c.logic === 'or' ? 'OU' : 'E'}`,
      accent: { bg: 'rgba(168,85,247,0.12)', fg: '#9333ea' },
    };
  }
  const c = step.config as SendWhatsappStepConfig;
  const ch = channels.find((x) => x.id === c.channelId)?.name ?? 'canal não selecionado';
  const tpl = templates.find((x) => x.id === c.templateId)?.name ?? 'template não selecionado';
  return {
    icon: MessageCircle,
    title: 'Enviar WhatsApp',
    summary: `${tpl} • ${ch}`,
    accent: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  };
}

function Connector({ short }: { short?: boolean } = {}) {
  return (
    <div
      style={{
        width: 2,
        height: short ? 14 : 20,
        background: 'var(--edge-strong, var(--edge))',
      }}
    />
  );
}

function PlusBetween({ onClick, label }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-90"
      style={{
        background: 'var(--brand-500, #6366f1)',
        color: '#fff',
      }}
      title="Adicionar passo"
    >
      <Plus className="w-3.5 h-3.5" />
      {label ?? 'Adicionar passo'}
    </button>
  );
}

function EndCard() {
  return (
    <div
      className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: 'var(--surface-hover)',
        color: 'var(--ink-3)',
        border: '1px solid var(--edge)',
      }}
    >
      Fim do fluxo
    </div>
  );
}
