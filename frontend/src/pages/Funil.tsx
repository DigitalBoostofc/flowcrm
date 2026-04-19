import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ArrowUpDown, Plus, List, GitBranch,
  TrendingUp, X, Pencil, Trash2, GripVertical, Link as LinkIcon, Info,
  ListChecks, Trophy, ChevronLeft, ChevronRight, Settings as SettingsIcon,
} from 'lucide-react';
import { listAllLeads } from '@/api/leads';
import { listPipelines, createPipeline, updatePipeline, deletePipeline } from '@/api/pipelines';
import { createStage, updateStage, deleteStage } from '@/api/stages';
import { listUsers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import type { Pipeline, Stage } from '@/types/api';
import NegocioKanban from '@/components/negocios/NegocioKanban';
import NegocioDetailPanel from '@/components/negocios/NegocioDetailPanel';
import RequiredFieldsDrawer from '@/components/settings/RequiredFieldsDrawer';
import Sidebar from '@/components/layout/Sidebar';
import { formatBRL } from '@/lib/format';

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

/* ── Personalizar Funis Modal ────────────────────────── */

function PersonalizarFunisModal({
  open, onClose, pipelines, onEditStages, onAddFunil,
}: {
  open: boolean;
  onClose: () => void;
  pipelines: Pipeline[];
  onEditStages: (pipelineId: string) => void;
  onAddFunil: () => void;
}) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { name: string; sigla: string }>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, { name: string; sigla: string }> = {};
    for (const p of pipelines) {
      initial[p.id] = { name: p.name, sigla: siglaOf(p) };
    }
    setDrafts(initial);
  }, [open, pipelines]);

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; sigla?: string } }) =>
      updatePipeline(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const handleAddClick = () => {
    onAddFunil();
  };

  const saveField = (id: string, field: 'name' | 'sigla', value: string) => {
    const current = pipelines.find((p) => p.id === id);
    if (!current) return;
    const currentVal = field === 'name' ? current.name : siglaOf(current);
    if (value.trim() === currentVal) return;
    updateMut.mutate({ id, data: { [field]: value.trim() } });
  };

  const onDelete = (p: Pipeline) => {
    if (pipelines.length <= 1) {
      alert('É necessário manter pelo menos um funil.');
      return;
    }
    if (p.isDefault) {
      alert('Não é possível excluir o funil padrão. Defina outro como padrão primeiro.');
      return;
    }
    if (confirm(`Excluir o funil "${p.name}"? Leads dele também podem ser perdidos.`)) {
      deleteMut.mutate(p.id);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl max-w-3xl w-full my-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--edge)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--ink-1)' }}>Personalizar funis</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-3)' }}
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Column headers */}
          <div
            className="grid items-center gap-3 px-2 py-2 text-xs font-bold uppercase tracking-wide"
            style={{
              gridTemplateColumns: '24px 40px 1fr 120px 140px 120px',
              color: 'var(--ink-2)',
            }}
          >
            <div />
            <div />
            <div>Nome</div>
            <div>Sigla</div>
            <div />
            <div />
          </div>

          {pipelines.length === 0 ? (
            <div className="text-sm py-6 text-center" style={{ color: 'var(--ink-3)' }}>
              Nenhum funil cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-1">
              {pipelines.map((p, idx) => {
                const draft = drafts[p.id];
                return (
                  <div
                    key={p.id}
                    className="grid items-center gap-3 px-2 py-2 rounded-lg"
                    style={{
                      gridTemplateColumns: '24px 40px 1fr 120px 140px 120px',
                      background: 'var(--surface-hover)',
                    }}
                  >
                    <div style={{ color: 'var(--ink-3)' }}>
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="relative">
                      <input
                        value={draft?.name ?? ''}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                        onBlur={(e) => saveField(p.id, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 pr-8 rounded-md outline-none text-sm"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                      />
                      <Pencil
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                        style={{ color: 'var(--brand-500, #6366f1)' }}
                      />
                    </div>
                    <input
                      value={draft?.sigla ?? ''}
                      maxLength={10}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: { ...prev[p.id], sigla: e.target.value.toUpperCase() } }))}
                      onBlur={(e) => saveField(p.id, 'sigla', e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded-md outline-none text-sm font-bold tracking-wide"
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-1)' }}
                    />
                    <button
                      onClick={() => onEditStages(p.id)}
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: 'var(--brand-500, #6366f1)' }}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Editar etapas
                    </button>
                    <button
                      onClick={() => onDelete(p)}
                      className="flex items-center gap-1.5 text-sm"
                      style={{ color: p.isDefault ? 'var(--ink-3)' : 'var(--ink-2)' }}
                      disabled={p.isDefault}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir funil
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleAddClick}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar funil
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Etapas do Funil modal ───────────────────────────── */

type EtapasTab = 'etapas' | 'status';

function EtapasFunilModal({
  open, onClose, pipeline, onBack,
}: {
  open: boolean;
  onClose: () => void;
  pipeline: Pipeline | null;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<EtapasTab>('etapas');
  const [showTooltip, setShowTooltip] = useState(false);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({});
  const [requiredFieldsStage, setRequiredFieldsStage] = useState<Stage | null>(null);

  const stages = useMemo<Stage[]>(
    () => (pipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position),
    [pipeline],
  );

  useEffect(() => {
    if (!open) return;
    setTab('etapas');
    const names: Record<string, string> = {};
    const times: Record<string, string> = {};
    for (const s of stages) {
      names[s.id] = s.name;
      times[s.id] = s.timeLimitDays == null ? '' : String(s.timeLimitDays);
    }
    setNameDrafts(names);
    setTimeDrafts(times);
  }, [open, stages]);

  const updateStageMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; timeLimitDays?: number | null } }) =>
      updateStage(pipeline!.id, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const addStageMut = useMutation({
    mutationFn: () =>
      createStage(pipeline!.id, { name: 'Nova etapa', position: stages.length }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const deleteStageMut = useMutation({
    mutationFn: (id: string) => deleteStage(pipeline!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  if (!open || !pipeline) return null;

  const saveName = (id: string, value: string) => {
    const current = stages.find((s) => s.id === id);
    if (!current) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === current.name) return;
    updateStageMut.mutate({ id, data: { name: trimmed } });
  };

  const saveTime = (id: string, value: string) => {
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

  const onDeleteStage = (s: Stage) => {
    if (confirm(`Excluir a etapa "${s.name}"?`)) deleteStageMut.mutate(s.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl max-w-3xl w-full my-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--edge)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--ink-1)' }}>
            Etapas do {pipeline.name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-xs font-medium px-2 py-1 rounded hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-3)' }}
            >
              Voltar
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-3)' }}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6" style={{ borderBottom: '1px solid var(--edge)' }}>
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

        <div className="px-6 py-5">
          {tab === 'etapas' ? (
            <>
              {/* Column headers */}
              <div
                className="grid items-center gap-3 px-2 py-2 text-xs font-bold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: '24px 40px 1.4fr 1fr 160px 40px',
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
                        gridTemplateColumns: '24px 40px 1.4fr 1fr 160px 40px',
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
                        value={nameDrafts[s.id] ?? ''}
                        onChange={(e) => setNameDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        onBlur={(e) => saveName(s.id, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-md outline-none text-sm bg-transparent"
                        style={{ border: '1px solid transparent', color: 'var(--ink-1)' }}
                        onFocus={(e) => (e.currentTarget.style.border = '1px solid var(--edge)')}
                      />
                      <input
                        value={timeDrafts[s.id] ?? ''}
                        onChange={(e) => setTimeDrafts((prev) => ({ ...prev, [s.id]: e.target.value.replace(/[^\d]/g, '') }))}
                        onBlur={(e) => saveTime(s.id, e.target.value)}
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
                        className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-500"
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

      <RequiredFieldsDrawer
        open={!!requiredFieldsStage}
        stage={requiredFieldsStage}
        onClose={() => setRequiredFieldsStage(null)}
      />
    </div>
  );
}

/* ── Pipeline sidebar ────────────────────────────────── */

function PipelineSidebar({
  pipelines, selectedId, onSelect, onAddClick, onToggleMainNav, mainNavExpanded, onSettings,
}: {
  pipelines: Pipeline[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddClick: () => void;
  onToggleMainNav: () => void;
  mainNavExpanded: boolean;
  onSettings: () => void;
}) {
  return (
    <aside
      className="relative flex-shrink-0 flex flex-col items-center justify-between py-3"
      style={{
        width: 56,
        background: 'var(--surface)',
        borderRight: '1px solid var(--edge)',
      }}
    >
      <div className="flex flex-col items-center gap-2 w-full">
        {pipelines.map((p) => {
          const active = p.id === selectedId;
          const isManagement = (p as any).kind === 'management';
          const activeColor = isManagement ? '#10B981' : 'var(--brand-500, #6366f1)';
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              title={p.name}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-tight transition-all"
              style={{
                background: active ? activeColor : 'var(--surface-hover)',
                color: active ? '#fff' : (isManagement ? '#10B981' : 'var(--ink-2)'),
                border: active ? `1px solid ${activeColor}` : '1px solid var(--edge)',
              }}
            >
              {siglaOf(p)}
            </button>
          );
        })}

        <button
          onClick={onAddClick}
          title="Personalizar funis"
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--brand-500, #6366f1)',
            border: '1px dashed var(--edge-strong, var(--edge))',
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={onSettings}
        title="Configurações"
        className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)]"
        style={{ color: 'var(--ink-2)' }}
      >
        <SettingsIcon className="w-4 h-4" />
      </button>

      <button
        onClick={onToggleMainNav}
        title={mainNavExpanded ? 'Recolher menu' : 'Expandir menu'}
        aria-label={mainNavExpanded ? 'Recolher menu' : 'Expandir menu'}
        style={{
          position: 'absolute',
          top: '50%',
          right: -10,
          transform: 'translateY(-50%)',
          zIndex: 20,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'var(--surface-raised)',
          border: '1px solid var(--edge-strong, var(--edge))',
          color: 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
        }}
      >
        {mainNavExpanded
          ? <ChevronLeft className="w-3 h-3" strokeWidth={2} />
          : <ChevronRight className="w-3 h-3" strokeWidth={2} />}
      </button>
    </aside>
  );
}

/* ── Page ────────────────────────────────────────────── */

export default function Funil() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [personalizarOpen, setPersonalizarOpen] = useState(false);
  const [editingStagesPipelineId, setEditingStagesPipelineId] = useState<string | null>(null);

  const createPipelineMut = useMutation({
    mutationFn: (name: string) => createPipeline({ name }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      setEditingStagesPipelineId(created.id);
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['negocios'],
    queryFn: listAllLeads,
  });

  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setSelectedPipelineId(def.id);
    }
    if (selectedPipelineId && pipelines.length > 0 && !pipelines.find((p) => p.id === selectedPipelineId)) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setSelectedPipelineId(def.id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId) ?? null,
    [pipelines, selectedPipelineId],
  );

  const pipelineLeads = useMemo(() => {
    const byId = new Map(pipelines.map((p) => [p.id, p]));
    return leads
      .filter((l) => l.pipelineId === selectedPipelineId)
      .map((l) => ({ ...l, pipeline: l.pipeline ?? byId.get(l.pipelineId) }));
  }, [leads, pipelines, selectedPipelineId]);

  const filteredLeads = useMemo(() => {
    if (!debouncedSearch) return pipelineLeads;
    return pipelineLeads.filter((l) => {
      const text = [
        l.title,
        l.contact?.name,
        l.contact?.company,
        l.contact?.email,
        l.stage?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(debouncedSearch);
    });
  }, [pipelineLeads, debouncedSearch]);

  const total = filteredLeads.length;
  const totalValue = filteredLeads.reduce((s, l) => s + Number(l.value ?? 0), 0);

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />

      <PipelineSidebar
        pipelines={pipelines}
        selectedId={selectedPipelineId}
        onSelect={setSelectedPipelineId}
        onAddClick={() => setPersonalizarOpen(true)}
        onToggleMainNav={toggleSidebar}
        mainNavExpanded={!sidebarCollapsed}
        onSettings={() => navigate('/settings')}
      />

      <div className="flex-1 min-w-0 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5 transition-colors"
            style={{ color: 'var(--ink-3)', background: 'var(--surface)', border: '1px solid var(--edge)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            ← Voltar
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            {selectedPipeline?.name ?? 'Funil'}
          </h1>
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {formatBRL(totalValue)}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--surface-hover)',
              color: 'var(--ink-2)',
              border: '1px solid var(--edge)',
            }}
          >
            {total} negócio{total !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
          >
            <button
              onClick={() => navigate('/negocios')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--ink-2)' }}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: 'var(--brand-500, #6366f1)', color: '#fff' }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Funil
            </button>
          </div>

          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <TrendingUp className="w-4 h-4" />
            Conversão do funil
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--ink-3)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no funil"
              className="w-full pl-9 pr-3 py-2 rounded-lg outline-none text-sm"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
              }}
            />
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <ArrowUpDown className="w-4 h-4" />
            Ordenar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/negocios')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar negócio
          </button>
        </div>
      </div>

      {/* Body: kanban */}
      <div>
        {isLoading ? (
          <div
            className="rounded-xl text-center py-10 text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
          >
            Carregando...
          </div>
        ) : pipelines.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
          >
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--ink-1)' }}>
              Nenhum funil criado ainda
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
              Clique no + ao lado para criar seu primeiro funil.
            </p>
            <button
              onClick={() => setPersonalizarOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              <Plus className="w-4 h-4" /> Criar funil
            </button>
          </div>
        ) : (
          <NegocioKanban
            pipeline={selectedPipeline}
            leads={filteredLeads}
            onCardClick={(id) => setSelectedLeadId(id)}
          />
        )}
      </div>
      </div>

      <PersonalizarFunisModal
        open={personalizarOpen}
        onClose={() => setPersonalizarOpen(false)}
        pipelines={pipelines}
        onEditStages={(id) => {
          setPersonalizarOpen(false);
          setEditingStagesPipelineId(id);
        }}
        onAddFunil={() => {
          setPersonalizarOpen(false);
          createPipelineMut.mutate(`Novo funil ${pipelines.length + 1}`);
        }}
      />

      <EtapasFunilModal
        open={!!editingStagesPipelineId}
        pipeline={pipelines.find((p) => p.id === editingStagesPipelineId) ?? null}
        onClose={() => setEditingStagesPipelineId(null)}
        onBack={() => {
          setEditingStagesPipelineId(null);
          setPersonalizarOpen(true);
        }}
      />

      {selectedLeadId && (() => {
        // Busca em todos os leads (não só filtrados) para manter o painel aberto durante troca de funil
        const sel = filteredLeads.find((l) => l.id === selectedLeadId)
          ?? leads.find((l) => l.id === selectedLeadId);
        if (!sel) return null;
        return (
          <NegocioDetailPanel
            lead={sel}
            currentUser={currentUser}
            users={users}
            pipelines={pipelines}
            onClose={() => setSelectedLeadId(null)}
            onPipelineMoved={(newPipelineId) => setSelectedPipelineId(newPipelineId)}
          />
        );
      })()}
    </div>
  );
}
