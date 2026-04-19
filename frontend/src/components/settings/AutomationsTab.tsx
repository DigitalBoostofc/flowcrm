import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Zap, Play, Pause, Pencil, Trash2, ListChecks } from 'lucide-react';
import {
  listAutomations, deleteAutomation, updateAutomation,
  type Automation,
} from '@/api/automations';
import { listPipelines } from '@/api/pipelines';
import AutomationEditor from './automations/AutomationEditor';

type View = 'list' | 'editor';

export default function AutomationsTab() {
  const qc = useQueryClient();
  const { data: automations = [] } = useQuery({ queryKey: ['automations'], queryFn: listAutomations });
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });

  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<Automation | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateAutomation(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const handleNew = () => {
    setEditing(null);
    setView('editor');
  };

  const handleEdit = (a: Automation) => {
    setEditing(a);
    setView('editor');
  };

  const handleBack = () => {
    setView('list');
    setEditing(null);
  };

  const handleDelete = (a: Automation) => {
    if (confirm(`Excluir automação "${a.name}"?`)) deleteMut.mutate(a.id);
  };

  const triggerLabel = (a: Automation): string => {
    if (a.triggerType === 'pipeline') {
      const p = pipelines.find((x) => x.id === a.pipelineId);
      return `Ao entrar no funil "${p?.name ?? '—'}"`;
    }
    const p = pipelines.find((x) => x.stages?.some((s) => s.id === a.stageId));
    const s = p?.stages?.find((x) => x.id === a.stageId);
    return `Ao chegar na etapa "${s?.name ?? '—'}"${p ? ` (${p.name})` : ''}`;
  };

  if (view === 'editor') {
    return (
      <AutomationEditor
        automation={editing}
        onBack={handleBack}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['automations'] });
          handleBack();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
            Automações
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
            Crie fluxos que disparam quando um negócio entra em um funil ou etapa.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: 'var(--brand-500, #6366f1)' }}
        >
          <Plus className="w-4 h-4" />
          Criar automação
        </button>
      </div>

      {automations.length === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center text-center py-12 px-6"
          style={{ background: 'var(--surface)', border: '1px dashed var(--edge-strong, var(--edge))' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(99,102,241,0.1)' }}
          >
            <Zap className="w-7 h-7" style={{ color: 'var(--brand-500, #6366f1)' }} />
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ink-1)' }}>
            Nenhuma automação ainda
          </h3>
          <p className="text-xs mb-4 max-w-sm" style={{ color: 'var(--ink-3)' }}>
            Automatize o envio de mensagens e outras ações quando um negócio atingir determinado ponto do funil.
          </p>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Criar primeira automação
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((a) => {
            const stepCount = a.steps?.length ?? 0;
            return (
              <div
                key={a.id}
                className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
              >
                <button
                  onClick={() => toggleMut.mutate({ id: a.id, active: !a.active })}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={{
                    background: a.active ? 'rgba(16,185,129,0.1)' : 'var(--surface-hover)',
                    color: a.active ? '#059669' : 'var(--ink-3)',
                    border: `1px solid ${a.active ? 'rgba(16,185,129,0.3)' : 'var(--edge)'}`,
                  }}
                >
                  {a.active ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  {a.active ? 'Ativa' : 'Pausada'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: 'var(--ink-1)' }}>
                    {a.name}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {triggerLabel(a)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3 h-3" />
                      {stepCount} passo{stepCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(a)}
                    className="p-2 rounded-md hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-2)' }}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="p-2 rounded-md hover:bg-red-500/10"
                    style={{ color: '#dc2626' }}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
