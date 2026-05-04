import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ArrowUpDown, Plus, List, GitBranch,
  X, Pencil, Trash2, GripVertical, Link as LinkIcon, Info,
  ListChecks, Trophy, ChevronLeft, ChevronRight, Settings as SettingsIcon, Tag,
  Briefcase, ClipboardList, Snowflake, XCircle, CheckCircle2, Menu, Zap,
} from 'lucide-react';
import { listAllLeads } from '@/api/leads';
import LabelsManager from '@/components/labels/LabelsManager';
import { listPipelines, createPipeline, updatePipeline, deletePipeline } from '@/api/pipelines';
import { createStage, updateStage, deleteStage } from '@/api/stages';
import { listUsers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import type { Pipeline, PipelineKind, Stage } from '@/types/api';
import { AddNegocioModal } from '@/pages/Negocios';
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

type EtapasTab = 'etapas' | 'etiquetas' | 'status';

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
        <div className="flex items-center gap-1 px-6" style={{ borderBottom: '1px solid var(--edge)' }}>
          {([
            { id: 'etapas',    icon: ListChecks, label: 'Etapas' },
            { id: 'etiquetas', icon: Tag,        label: 'Etiquetas' },
          ] as { id: EtapasTab; icon: typeof Tag; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 py-3 px-1 mr-4 text-sm font-medium transition-colors"
              style={{
                color: tab === id ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
                borderBottom: tab === id ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          {/* Status do negócio — aba discreta no final */}
          <button
            onClick={() => setTab('status')}
            className="flex items-center gap-1.5 py-3 px-1 ml-auto text-xs font-medium transition-colors"
            style={{
              color: tab === 'status' ? 'var(--brand-500, #6366f1)' : 'var(--ink-3)',
              borderBottom: tab === 'status' ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
            }}
          >
            <Trophy className="w-3.5 h-3.5" />
            Status do negócio
          </button>
        </div>

        <div className="px-6 py-5">
          {tab === 'etapas' && (
            <>
              {/* Column headers */}
              <div
                className="grid items-center gap-3 px-2 py-2 text-xs font-bold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: '24px 40px 1.4fr 1fr 160px 40px',
                  color: 'var(--ink-2)',
                }}
              >
                <div /><div />
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
                      style={{ background: '#1e1b4b', color: '#fff', maxWidth: 220, lineHeight: 1.5 }}
                    >
                      Defina qual é o Tempo Limite que um negócio deve passar nesta etapa. Após isso, ele será destacado no funil para facilitar o acompanhamento.
                    </div>
                  )}
                </div>
                <div /><div />
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

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => addStageMut.mutate()}
                  disabled={addStageMut.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--brand-500, #6366f1)' }}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar etapa
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--surface-hover)', color: 'var(--ink-1)', border: '1px solid var(--edge)' }}
                >
                  Concluir
                </button>
              </div>
            </>
          )}

          {tab === 'etiquetas' && (
            <div className="max-w-md">
              <LabelsManager pipelineId={pipeline.id} />
            </div>
          )}

          {tab === 'status' && (
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
  pipelines, selectedId, onSelect, onCreate, onToggleMainNav, mainNavExpanded, onSettings,
}: {
  pipelines: Pipeline[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (kind: PipelineKind) => void;
  onToggleMainNav: () => void;
  mainNavExpanded: boolean;
  onSettings: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

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

        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            title="Criar novo funil"
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--surface-hover)]"
            style={{
              background: 'transparent',
              color: 'var(--brand-500, #6366f1)',
              border: '1px dashed var(--edge-strong, var(--edge))',
            }}
          >
            <Plus className="w-4 h-4" />
          </button>

          {pickerOpen && (
            <div
              className="absolute left-full top-0 ml-2 z-30 w-52 rounded-xl p-1.5 shadow-lg"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--edge)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div
                className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--ink-3)' }}
              >
                Novo funil
              </div>
              <button
                onClick={() => { setPickerOpen(false); onCreate('sale'); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,91,255,0.12)', color: 'var(--brand-500, #6366f1)' }}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink-1)' }}>
                    Funil de vendas
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
                    Para acompanhar negócios
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setPickerOpen(false); onCreate('management'); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink-1)' }}>
                    Funil de gestão
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
                    Para processos internos
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const openMobileSidebar = useSidebarStore((s) => s.openMobile);
  const closeMobileSidebar = useSidebarStore((s) => s.closeMobile);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const [search, setSearch] = useState('');
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(() => searchParams.get('pipeline') ?? '');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => searchParams.get('lead'));
  const [personalizarOpen, setPersonalizarOpen] = useState(false);
  const [editingStagesPipelineId, setEditingStagesPipelineId] = useState<string | null>(null);

  const [addNegocioOpen, setAddNegocioOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | null>(null);
  const [createFunilModal, setCreateFunilModal] = useState<{ open: boolean; kind: PipelineKind }>({ open: false, kind: 'sale' });
  const [createFunilForm, setCreateFunilForm] = useState({ name: '', sigla: '' });

  const createPipelineMut = useMutation({
    mutationFn: ({ name, kind }: { name: string; kind?: PipelineKind }) =>
      createPipeline({ name, kind }),
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

  // Clear URL params after consuming them (avoid re-opening on refresh)
  useEffect(() => {
    if (searchParams.get('lead') || searchParams.get('pipeline')) {
      setSearchParams({}, { replace: true });
    }
  }, []);

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
    // Por padrão o kanban só mostra negócios ativos; frozen/won/lost ficam ocultos
    let result = pipelineLeads.filter((l) => filterStatus ? l.status === filterStatus : l.status === 'active');

    if (debouncedSearch) {
      result = result.filter((l) => {
        const text = [l.title, l.contact?.name, l.contact?.company, l.contact?.email, l.stage?.name]
          .filter(Boolean).join(' ').toLowerCase();
        return text.includes(debouncedSearch);
      });
    }
    if (filterAssignee) result = result.filter((l) => l.assignedToId === filterAssignee);
    if (filterStage)    result = result.filter((l) => l.stageId === filterStage);
    if (filterOrigin)   result = result.filter((l) => l.contact?.origin === filterOrigin);
    if (filterDateFrom) result = result.filter((l) => new Date(l.createdAt) >= new Date(filterDateFrom));
    if (filterDateTo)   result = result.filter((l) => new Date(l.createdAt) <= new Date(filterDateTo + 'T23:59:59'));

    return result;
  }, [pipelineLeads, debouncedSearch, filterAssignee, filterStage, filterOrigin, filterStatus, filterDateFrom, filterDateTo]);

  const total = filteredLeads.length;
  const totalValue = filteredLeads.reduce((s, l) => s + Number(l.value ?? 0), 0);

  const frozenCount = pipelineLeads.filter((l) => l.status === 'frozen').length;
  const lostCount   = pipelineLeads.filter((l) => l.status === 'lost').length;
  const wonCount    = pipelineLeads.filter((l) => l.status === 'won').length;

  const activeFilters = [filterAssignee, filterStage, filterOrigin, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFilterAssignee(''); setFilterStage(''); setFilterOrigin('');
    setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo('');
  };

  const originOptions = useMemo(() => {
    const set = new Set<string>();
    pipelineLeads.forEach((l) => { if (l.contact?.origin) set.add(l.contact.origin); });
    return [...set].sort();
  }, [pipelineLeads]);

  const stages = useMemo(
    () => (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position),
    [selectedPipeline],
  );

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center gap-3 px-4 h-[52px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        <button onClick={openMobileSidebar} className="p-1.5 rounded-lg -ml-1" style={{ color: 'var(--ink-2)' }} aria-label="Abrir menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}>
            <Zap className="w-3 h-3 text-white" strokeWidth={2.5} fill="white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>AppexCRM</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={closeMobileSidebar} />
      )}

      <div className="flex flex-1 min-h-0">
      <Sidebar />

      <PipelineSidebar
        pipelines={pipelines}
        selectedId={selectedPipelineId}
        onSelect={(id) => { setSelectedPipelineId(id); clearFilters(); }}
        onCreate={(kind) => {
          const saleCount = pipelines.filter((p) => (p as any).kind !== 'management').length;
          const managementCount = pipelines.filter((p) => (p as any).kind === 'management').length;
          const defaultName = kind === 'management'
            ? `Funil de gestão ${managementCount + 1}`
            : `Funil de vendas ${saleCount + 1}`;
          setCreateFunilForm({ name: defaultName, sigla: '' });
          setCreateFunilModal({ open: true, kind });
        }}
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
              onClick={() => navigate(
                selectedPipelineId
                  ? `/negocios?pipeline=${selectedPipelineId}&status=active`
                  : '/negocios?status=active',
              )}
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
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: filterOpen || activeFilters > 0 ? 'var(--brand-50)' : 'var(--surface)',
              border: `1px solid ${activeFilters > 0 ? 'var(--brand-500)' : 'var(--edge)'}`,
              color: activeFilters > 0 ? 'var(--brand-500)' : 'var(--ink-1)',
            }}
          >
            <Filter className="w-4 h-4" />
            Filtros{activeFilters > 0 && ` (${activeFilters})`}
          </button>
          <button
            onClick={() => setLabelsOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: labelsOpen ? 'var(--brand-50)' : 'var(--surface)',
              border: `1px solid ${labelsOpen ? 'var(--brand-500)' : 'var(--edge)'}`,
              color: labelsOpen ? 'var(--brand-500)' : 'var(--ink-1)',
            }}
          >
            <Tag className="w-4 h-4" />
            Etiquetas
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Atalhos para negócios ocultos do kanban */}
          <button
            onClick={() => navigate(`/negocios?pipeline=${selectedPipelineId}&status=frozen`)}
            title={`Congelados (${frozenCount})`}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--edge)', color: '#0ea5e9' }}
          >
            <Snowflake className="w-4 h-4" />
            {frozenCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#0ea5e9' }}>{frozenCount}</span>
            )}
          </button>
          <button
            onClick={() => navigate(`/negocios?pipeline=${selectedPipelineId}&status=lost`)}
            title={`Perdidos (${lostCount})`}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--edge)', color: '#ef4444' }}
          >
            <XCircle className="w-4 h-4" />
            {lostCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#ef4444' }}>{lostCount}</span>
            )}
          </button>
          <button
            onClick={() => navigate(`/negocios?pipeline=${selectedPipelineId}&status=won`)}
            title={`Ganhos (${wonCount})`}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--edge)', color: '#10b981' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {wonCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#10b981' }}>{wonCount}</span>
            )}
          </button>
          <button
            onClick={() => setAddNegocioOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar negócio
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {filterOpen && (
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
        >
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Status</option>
            <option value="active">Em andamento</option>
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
            <option value="frozen">Congelado</option>
          </select>

          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Responsável</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Etapa</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {originOptions.length > 0 && (
            <select value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
              <option value="">Origem</option>
              {originOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: filterDateFrom ? 'var(--ink-1)' : 'var(--ink-3)' }}
              title="De (data de criação)"
            />
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>até</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: filterDateTo ? 'var(--ink-1)' : 'var(--ink-3)' }}
              title="Até (data de criação)"
            />
          </div>

          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              Limpar filtros
            </button>
          )}

          <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>
            {filteredLeads.length} de {pipelineLeads.length} negócios
          </span>
        </div>
      )}

      {/* Painel de etiquetas */}
      {labelsOpen && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
        >
          <LabelsManager />
        </div>
      )}

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
            onAddToStage={(stageId) => { setAddStageId(stageId); setAddNegocioOpen(true); }}
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
          createPipelineMut.mutate({ name: `Novo funil ${pipelines.length + 1}` });
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

      <AddNegocioModal
        open={addNegocioOpen}
        onClose={() => { setAddNegocioOpen(false); setAddStageId(null); }}
        pipelines={pipelines}
        users={users}
        currentUser={currentUser}
        initialPipelineId={addStageId ? selectedPipelineId : null}
        initialStageId={addStageId}
      />

      {/* Modal de 2ª etapa — nome e sigla do novo funil */}
      {createFunilModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setCreateFunilModal({ open: false, kind: 'sale' })}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: createFunilModal.kind === 'management' ? 'rgba(16,185,129,0.12)' : 'rgba(99,91,255,0.12)',
                    color: createFunilModal.kind === 'management' ? '#10B981' : 'var(--brand-500, #6366f1)',
                  }}
                >
                  {createFunilModal.kind === 'management'
                    ? <ClipboardList className="w-3.5 h-3.5" />
                    : <Briefcase className="w-3.5 h-3.5" />}
                </div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--ink-1)' }}>
                  {createFunilModal.kind === 'management' ? 'Funil de gestão' : 'Funil de vendas'}
                </h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Defina o nome e a sigla que aparecerá na sidebar.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Nome do funil</label>
                <input
                  autoFocus
                  value={createFunilForm.name}
                  onChange={(e) => setCreateFunilForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Vendas Brasil"
                  className="input-base"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                  Sigla <span className="font-normal" style={{ color: 'var(--ink-3)' }}>(máx. 4 letras — aparece na sidebar)</span>
                </label>
                <input
                  value={createFunilForm.sigla}
                  onChange={(e) => setCreateFunilForm((f) => ({ ...f, sigla: e.target.value.toUpperCase().slice(0, 4) }))}
                  placeholder="Ex: VBR"
                  maxLength={4}
                  className="input-base"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setCreateFunilModal({ open: false, kind: 'sale' })}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                disabled={!createFunilForm.name.trim() || createPipelineMut.isPending}
                onClick={() => {
                  createPipelineMut.mutate(
                    { name: createFunilForm.name.trim(), kind: createFunilModal.kind, sigla: createFunilForm.sigla.trim() || undefined } as any,
                    { onSuccess: () => setCreateFunilModal({ open: false, kind: 'sale' }) },
                  );
                }}
                className="btn-primary"
              >
                {createPipelineMut.isPending ? 'Criando...' : 'Criar funil'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
