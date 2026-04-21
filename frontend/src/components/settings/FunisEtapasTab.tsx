import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, GripVertical, Trash2, Info, ListChecks, Trophy,
  TrendingUp, LayoutGrid, X, Search,
} from 'lucide-react';
import type { PipelineKind, Lead, LeadStatus } from '@/types/api';
import { listPipelines, createPipeline, updatePipeline, deletePipeline } from '@/api/pipelines';
import { createStage, updateStage, deleteStage } from '@/api/stages';
import { listLeads, updateLeadStatus } from '@/api/leads';
import { listLossReasons } from '@/api/loss-reasons';
import type { Pipeline, Stage } from '@/types/api';
import RequiredFieldsDrawer from './RequiredFieldsDrawer';
import { StatusDropdown, STATUS_CONFIG } from '@/components/negocios/StatusDropdown';

function leadDisplayName(lead: Lead): string {
  return lead.contact?.name ?? lead.externalName ?? lead.title ?? 'Sem nome';
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}


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
  const [requiredFieldsStage, setRequiredFieldsStage] = useState<Stage | null>(null);
  const [kindPickerOpen, setKindPickerOpen] = useState(false);
  const [kindDraft, setKindDraft] = useState<PipelineKind | null>(null);
  const [newName, setNewName] = useState('');
  const [newSigla, setNewSigla] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

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

  const { data: pipelineLeads = [], isFetching: leadsLoading } = useQuery({
    queryKey: ['leads', selectedId, 'all'],
    queryFn: () => listLeads(selectedId!),
    enabled: !!selectedId && tab === 'status',
  });

  const { data: lossReasons = [] } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: listLossReasons,
    enabled: tab === 'status',
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status, lossReason }: { id: string; status: LeadStatus; lossReason?: string }) =>
      updateLeadStatus(id, status, lossReason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', selectedId, 'all'] }),
  });

  const filteredLeads = useMemo(() => {
    let leads = pipelineLeads;
    if (statusFilter !== 'all') leads = leads.filter((l) => l.status === statusFilter);
    if (statusSearch.trim()) {
      const q = statusSearch.toLowerCase();
      leads = leads.filter((l) =>
        leadDisplayName(l).toLowerCase().includes(q) ||
        l.stage?.name?.toLowerCase().includes(q),
      );
    }
    return leads;
  }, [pipelineLeads, statusFilter, statusSearch]);

  const updatePipelineMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; sigla?: string } }) =>
      updatePipeline(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const createPipelineMut = useMutation({
    mutationFn: ({ name, sigla, kind }: { name: string; sigla?: string; kind: PipelineKind }) =>
      createPipeline({ name, sigla: sigla || undefined, kind }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setSelectedId(p.id);
      setKindPickerOpen(false);
      setKindDraft(null);
      setNewName('');
      setNewSigla('');
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
    setKindDraft(null);
    setNewName('');
    setNewSigla('');
    setKindPickerOpen(true);
  };

  const handleKindSelected = (kind: PipelineKind) => {
    const defaultName = kind === 'sale'
      ? `Funil de Vendas ${pipelines.filter(p => p.kind === 'sale').length + 1}`
      : `Gestão ${pipelines.filter(p => p.kind === 'management').length + 1}`;
    setKindDraft(kind);
    setNewName(defaultName);
    setNewSigla(deriveSigla(defaultName));
  };

  const handleCreateConfirm = () => {
    if (!kindDraft || !newName.trim()) return;
    createPipelineMut.mutate({ name: newName.trim(), sigla: newSigla.trim() || undefined, kind: kindDraft });
  };

  const closeKindPicker = () => {
    setKindPickerOpen(false);
    setKindDraft(null);
    setNewName('');
    setNewSigla('');
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

      {/* Modal de criação de funil (2 etapas) */}
      {kindPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={closeKindPicker}
        >
          <div
            className="w-full max-w-sm animate-fade-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)', borderRadius: 12, boxShadow: 'var(--shadow-xl)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)' }}>Criar novo funil</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  {kindDraft ? 'Defina o nome e a sigla' : 'Escolha o tipo de funil'}
                </p>
              </div>
              <button onClick={closeKindPicker} style={{ color: 'var(--ink-3)' }}>
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            {/* Etapa 1 — escolher tipo */}
            {!kindDraft && (
              <div className="p-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleKindSelected('sale')}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(99,91,255,0.06)', border: '2px solid rgba(99,91,255,0.25)' }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)', boxShadow: '0 4px 12px rgba(99,91,255,0.4)' }}>
                    <TrendingUp className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--brand-500)' }}>Funil de Vendas</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                      Conta no Analytics e relatórios
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleKindSelected('management')}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '2px solid rgba(16,185,129,0.25)' }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}>
                    <LayoutGrid className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#10B981' }}>Funil de Gestão</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                      Estilo Trello — não conta no Analytics
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Etapa 2 — nome e sigla */}
            {kindDraft && (
              <div className="p-5 flex flex-col gap-4">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: kindDraft === 'sale' ? 'rgba(99,91,255,0.06)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${kindDraft === 'sale' ? 'rgba(99,91,255,0.25)' : 'rgba(16,185,129,0.25)'}`,
                    color: kindDraft === 'sale' ? 'var(--brand-500)' : '#10B981',
                  }}
                >
                  {kindDraft === 'sale'
                    ? <><TrendingUp className="w-3.5 h-3.5" /> Funil de Vendas</>
                    : <><LayoutGrid className="w-3.5 h-3.5" /> Funil de Gestão</>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Nome do funil</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNewSigla(deriveSigla(e.target.value));
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                    placeholder="Ex: Prospecção, Onboarding..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Sigla <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(aparece no seletor)</span></label>
                  <input
                    value={newSigla}
                    maxLength={10}
                    onChange={(e) => setNewSigla(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                    className="w-full px-3 py-2 rounded-lg text-sm font-bold tracking-wide outline-none"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                    placeholder="Ex: VND, GES..."
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setKindDraft(null); setNewName(''); setNewSigla(''); }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCreateConfirm}
                    disabled={!newName.trim() || createPipelineMut.isPending}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: kindDraft === 'sale' ? 'var(--brand-500)' : '#10B981' }}
                  >
                    {createPipelineMut.isPending ? 'Criando...' : 'Criar funil'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold tracking-tight flex-shrink-0"
                style={{
                  background: p.kind === 'management'
                    ? (active ? 'rgba(255,255,255,0.22)' : 'rgba(16,185,129,0.12)')
                    : (active ? 'rgba(255,255,255,0.22)' : 'var(--surface-hover)'),
                  color: p.kind === 'management'
                    ? (active ? '#fff' : '#10B981')
                    : (active ? '#fff' : 'var(--ink-2)'),
                }}
              >
                {siglaOf(p)}
              </span>
              <span className="truncate flex-1">{p.name}</span>
              {p.kind === 'management' && !active && (
                <span className="text-[9px] font-semibold px-1 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                  G
                </span>
              )}
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
                          onClick={() => setRequiredFieldsStage(s)}
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
              <div className="flex flex-col gap-3">
                {/* Barra de busca + filtros de status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                    <input
                      value={statusSearch}
                      onChange={(e) => setStatusSearch(e.target.value)}
                      placeholder="Buscar negócio ou etapa..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {(['all', 'active', 'won', 'lost'] as const).map((f) => {
                      const cfg = f === 'all' ? null : STATUS_CONFIG[f];
                      return (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: statusFilter === f
                              ? (cfg ? cfg.bg : 'var(--surface-hover)')
                              : 'transparent',
                            color: statusFilter === f
                              ? (cfg ? cfg.color : 'var(--ink-1)')
                              : 'var(--ink-3)',
                            border: statusFilter === f ? `1px solid ${cfg ? cfg.color : 'var(--edge)'}` : '1px solid transparent',
                          }}
                        >
                          {f === 'all' ? 'Todos' : STATUS_CONFIG[f].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tabela de negócios */}
                {leadsLoading ? (
                  <div className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>Carregando...</div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>
                    {pipelineLeads.length === 0 ? 'Nenhum negócio neste funil.' : 'Nenhum negócio encontrado.'}
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div
                      className="grid text-xs font-bold uppercase tracking-wide px-3 py-2"
                      style={{ gridTemplateColumns: '1fr 160px 160px', color: 'var(--ink-3)', borderBottom: '1px solid var(--edge)' }}
                    >
                      <div>Negócio</div>
                      <div>Etapa</div>
                      <div>Status</div>
                    </div>

                    <div>
                      {filteredLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="grid items-center px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
                          style={{ gridTemplateColumns: '1fr 160px 160px' }}
                        >
                          {/* Nome */}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>
                              {leadDisplayName(lead)}
                            </span>
                            {lead.value != null && (
                              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(lead.value))}
                              </span>
                            )}
                          </div>

                          {/* Etapa */}
                          <span
                            className="text-xs font-medium px-2 py-1 rounded-md truncate"
                            style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}
                          >
                            {lead.stage?.name ?? '—'}
                          </span>

                          {/* Status editável */}
                          <StatusDropdown
                            lead={lead}
                            lossReasons={lossReasons}
                            onUpdate={(id, status, lossReason) =>
                              updateStatusMut.mutate({ id, status, lossReason })
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div className="text-xs pt-1" style={{ color: 'var(--ink-3)' }}>
                      {filteredLeads.length} negócio{filteredLeads.length !== 1 ? 's' : ''}
                      {statusFilter !== 'all' || statusSearch ? ` filtrado${filteredLeads.length !== 1 ? 's' : ''}` : ''} de {pipelineLeads.length} total
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <RequiredFieldsDrawer
        open={!!requiredFieldsStage}
        stage={requiredFieldsStage}
        onClose={() => setRequiredFieldsStage(null)}
      />
    </div>
  );
}
