import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, GripVertical, Trash2, Info, ListChecks, Trophy,
} from 'lucide-react';
import { listPipelines, createPipeline, updatePipeline, deletePipeline } from '@/api/pipelines';
import { createStage, updateStage, deleteStage } from '@/api/stages';
import type { Pipeline, Stage } from '@/types/api';

function deriveSigla(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  if (letters.length >= 3) return letters.slice(0, 3);
  return name.replace(/\s+/g, '').slice(0, 3).toUpperCase();
}

function siglaOf(p: Pipeline): string {
  return (p.sigla && p.sigla.trim()) || deriveSigla(p.name);
}

type EtapasTab = 'etapas' | 'status';

export default function FunisEtapasTab() {
  const qc = useQueryClient();
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<EtapasTab>('etapas');
  const [showTooltip, setShowTooltip] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [siglaDraft, setSiglaDraft] = useState('');
  const [stageNameDrafts, setStageNameDrafts] = useState<Record<string, string>>({});
  const [stageTimeDrafts, setStageTimeDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedId && pipelines.length > 0) {
      setSelectedId(pipelines.find((p) => p.isDefault)?.id ?? pipelines[0].id);
    }
    if (selectedId && pipelines.length > 0 && !pipelines.find((p) => p.id === selectedId)) {
      setSelectedId(pipelines.find((p) => p.isDefault)?.id ?? pipelines[0].id);
    }
  }, [pipelines, selectedId]);

  const selected = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? null,
    [pipelines, selectedId],
  );

  const stages = useMemo<Stage[]>(
    () => (selected?.stages ?? []).slice().sort((a, b) => a.position - b.position),
    [selected],
  );

  useEffect(() => {
    if (!selected) {
      setNameDraft('');
      setSiglaDraft('');
      return;
    }
    setNameDraft(selected.name);
    setSiglaDraft(siglaOf(selected));
    const n: Record<string, string> = {};
    const t: Record<string, string> = {};
    for (const s of stages) {
      n[s.id] = s.name;
      t[s.id] = s.timeLimitDays == null ? '' : String(s.timeLimitDays);
    }
    setStageNameDrafts(n);
    setStageTimeDrafts(t);
  }, [selected, stages]);

  const updatePipelineMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; sigla?: string } }) =>
      updatePipeline(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const createPipelineMut = useMutation({
    mutationFn: (name: string) => createPipeline({ name }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setSelectedId(p.id);
    },
  });

  const deletePipelineMut = useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const updateStageMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; timeLimitDays?: number | null } }) =>
      updateStage(selected!.id, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const addStageMut = useMutation({
    mutationFn: () => createStage(selected!.id, { name: 'Nova etapa', position: stages.length }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const deleteStageMut = useMutation({
    mutationFn: (id: string) => deleteStage(selected!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const savePipelineField = (field: 'name' | 'sigla', value: string) => {
    if (!selected) return;
    const trimmed = value.trim();
    const current = field === 'name' ? selected.name : siglaOf(selected);
    if (!trimmed || trimmed === current) return;
    updatePipelineMut.mutate({ id: selected.id, data: { [field]: trimmed } });
  };

  const saveStageName = (id: string, value: string) => {
    const current = stages.find((s) => s.id === id);
    if (!current) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === current.name) return;
    updateStageMut.mutate({ id, data: { name: trimmed } });
  };

  const saveStageTime = (id: string, value: string) => {
    const current = stages.find((s) => s.id === id);
    if (!current) return;
    const trimmed = value.trim();
    if (trimmed === '') {
      if (current.timeLimitDays == null) return;
      updateStageMut.mutate({ id, data: { timeLimitDays: null } });
      return;
    }
    const num = parseInt(trimmed, 10);
    if (Number.isNaN(num) || num < 0) return;
    if (current.timeLimitDays === num) return;
    updateStageMut.mutate({ id, data: { timeLimitDays: num } });
  };

  const handleAddFunil = () => {
    createPipelineMut.mutate(`Novo funil ${pipelines.length + 1}`);
  };

  const handleDeletePipeline = () => {
    if (!selected) return;
    if (pipelines.length <= 1) {
      alert('É necessário manter pelo menos um funil.');
      return;
    }
    if (selected.isDefault) {
      alert('Não é possível excluir o funil padrão.');
      return;
    }
    if (confirm(`Excluir o funil "${selected.name}"?`)) {
      deletePipelineMut.mutate(selected.id);
    }
  };

  const onDeleteStage = (s: Stage) => {
    if (confirm(`Excluir a etapa "${s.name}"?`)) deleteStageMut.mutate(s.id);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
          Funis e etapas
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
          Organize seus funis de vendas e as etapas que cada negócio percorre até o fechamento.
        </p>
      </div>

      {/* Pipeline selector */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {pipelines.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? 'var(--brand-500, #6366f1)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--ink-2)',
                border: active ? '1px solid var(--brand-500, #6366f1)' : '1px solid var(--edge)',
              }}
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold tracking-tight"
                style={{
                  background: active ? 'rgba(255,255,255,0.22)' : 'var(--surface-hover)',
                  color: active ? '#fff' : 'var(--ink-2)',
                }}
              >
                {siglaOf(p)}
              </span>
              {p.name}
            </button>
          );
        })}
        <button
          onClick={handleAddFunil}
          disabled={createPipelineMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-[var(--surface-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--brand-500, #6366f1)',
            border: '1px dashed var(--edge-strong, var(--edge))',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar funil
        </button>
      </div>

      {!selected ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--ink-3)' }}>
          Crie um funil para começar.
        </div>
      ) : (
        <div
          className="rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
        >
          {/* Pipeline name + sigla + delete */}
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--edge)' }}
          >
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={(e) => savePipelineField('name', e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-md outline-none text-base font-semibold"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
              }}
            />
            <input
              value={siglaDraft}
              maxLength={10}
              onChange={(e) => setSiglaDraft(e.target.value.toUpperCase())}
              onBlur={(e) => savePipelineField('sigla', e.target.value.toUpperCase())}
              className="w-24 px-3 py-1.5 rounded-md outline-none text-sm font-bold tracking-wide text-center"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
              }}
              placeholder="Sigla"
            />
            <button
              onClick={handleDeletePipeline}
              disabled={selected.isDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-red-500/10 disabled:opacity-40"
              style={{ color: selected.isDefault ? 'var(--ink-3)' : '#dc2626' }}
            >
              <Trash2 className="w-4 h-4" />
              Excluir funil
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 px-5" style={{ borderBottom: '1px solid var(--edge)' }}>
            <button
              onClick={() => setTab('etapas')}
              className="flex items-center gap-2 py-3 text-sm font-medium transition-colors"
              style={{
                color: tab === 'etapas' ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
                borderBottom: tab === 'etapas' ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
              }}
            >
              <ListChecks className="w-4 h-4" />
              Etapas do funil
            </button>
            <button
              onClick={() => setTab('status')}
              className="flex items-center gap-2 py-3 text-sm font-medium transition-colors"
              style={{
                color: tab === 'status' ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
                borderBottom: tab === 'status' ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
              }}
            >
              <Trophy className="w-4 h-4" />
              Status do negócio neste funil
            </button>
          </div>

          <div className="px-5 py-4">
            {tab === 'etapas' ? (
              <>
                <div
                  className="grid items-center gap-3 px-2 py-2 text-xs font-bold uppercase tracking-wide"
                  style={{
                    gridTemplateColumns: '24px 40px 1.4fr 1fr 180px 40px',
                    color: 'var(--ink-2)',
                  }}
                >
                  <div />
                  <div />
                  <div>Nome</div>
                  <div className="flex items-center gap-1 relative">
                    Tempo limite na etapa
                    <button
                      className="p-0.5"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <Info className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                    </button>
                    {showTooltip && (
                      <div
                        className="absolute left-8 top-6 z-10 rounded-lg p-3 text-xs font-normal normal-case shadow-lg"
                        style={{
                          background: '#1e1b4b',
                          color: '#fff',
                          maxWidth: 220,
                          lineHeight: 1.5,
                        }}
                      >
                        Defina qual é o Tempo Limite que um negócio deve passar nesta etapa. Após isso, ele será destacado no funil para facilitar o acompanhamento.
                      </div>
                    )}
                  </div>
                  <div />
                  <div />
                </div>

                {stages.length === 0 ? (
                  <div className="text-sm py-6 text-center" style={{ color: 'var(--ink-3)' }}>
                    Nenhuma etapa cadastrada ainda.
                  </div>
                ) : (
                  <div>
                    {stages.map((s, idx) => (
                      <div
                        key={s.id}
                        className="grid items-center gap-3 px-2 py-3"
                        style={{
                          gridTemplateColumns: '24px 40px 1.4fr 1fr 180px 40px',
                          borderBottom: '1px solid var(--edge)',
                        }}
                      >
                        <div style={{ color: 'var(--ink-3)' }}>
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="text-sm font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <input
                          value={stageNameDrafts[s.id] ?? ''}
                          onChange={(e) => setStageNameDrafts((p) => ({ ...p, [s.id]: e.target.value }))}
                          onBlur={(e) => saveStageName(s.id, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-md outline-none text-sm bg-transparent"
                          style={{ border: '1px solid transparent', color: 'var(--ink-1)' }}
                          onFocus={(e) => (e.currentTarget.style.border = '1px solid var(--edge)')}
                        />
                        <input
                          value={stageTimeDrafts[s.id] ?? ''}
                          onChange={(e) => setStageTimeDrafts((p) => ({ ...p, [s.id]: e.target.value.replace(/[^\d]/g, '') }))}
                          onBlur={(e) => saveStageTime(s.id, e.target.value)}
                          placeholder="Sem definição"
                          inputMode="numeric"
                          className="w-full px-2 py-1.5 rounded-md outline-none text-sm bg-transparent"
                          style={{ border: '1px solid transparent', color: 'var(--ink-2)' }}
                          onFocus={(e) => (e.currentTarget.style.border = '1px solid var(--edge)')}
                        />
                        <button
                          className="flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: 'var(--brand-500, #6366f1)' }}
                          title="Configurar campos obrigatórios"
                        >
                          <ListChecks className="w-4 h-4" />
                          Campos obrigatórios
                        </button>
                        <button
                          onClick={() => onDeleteStage(s)}
                          className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                          style={{ color: '#dc2626' }}
                          title="Excluir etapa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => addStageMut.mutate()}
                  disabled={addStageMut.isPending}
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--brand-500, #6366f1)' }}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar etapa
                </button>
              </>
            ) : (
              <div
                className="text-sm p-6 text-center rounded-lg"
                style={{ background: 'var(--surface-hover)', color: 'var(--ink-3)' }}
              >
                Configuração de status por funil em breve.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
