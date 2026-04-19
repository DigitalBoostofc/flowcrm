import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ArrowUpDown, Columns3, Download, Upload, Plus,
  List, GitBranch, Map as MapIcon, TrendingUp, Star, Pencil, Trash2,
  ChevronDown, Briefcase,
} from 'lucide-react';
import { listAllLeads, updateLead, updateLeadStatus, moveLead, deleteLead } from '@/api/leads';
import { listPipelines } from '@/api/pipelines';
import { listUsers } from '@/api/users';
import type { Lead, LeadStatus, User } from '@/types/api';

/* ── Avatar helpers ──────────────────────────────────── */

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#f97316', '#0ea5e9',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, id, size = 28 }: { name: string; id: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </div>
  );
}

/* ── Formatters ──────────────────────────────────────── */

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_META: Record<LeadStatus, { label: string; fg: string; bg: string; dot: string }> = {
  active: { label: 'Em andamento', fg: '#a16207', bg: '#fef3c7', dot: '#f59e0b' },
  won: { label: 'Ganho', fg: '#166534', bg: '#dcfce7', dot: '#22c55e' },
  lost: { label: 'Perdido', fg: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
};

/* ── Status dropdown ─────────────────────────────────── */

function StatusCell({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(lead.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      setOpen(false);
    },
  });

  const meta = STATUS_META[lead.status];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-90"
        style={{ background: meta.bg, color: meta.fg }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
        {meta.label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-20 min-w-[160px] py-1"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
          >
            {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => {
              const m = STATUS_META[s];
              return (
                <button
                  key={s}
                  onClick={() => mut.mutate(s)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--ink-1)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Stage dropdown ──────────────────────────────────── */

function StageCell({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (stageId: string) => moveLead(lead.id, stageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      setOpen(false);
    },
  });

  const stages = lead.pipeline?.stages ?? [];
  const position = lead.stage?.position ?? 0;
  const label = lead.stage ? `${position + 1}. ${lead.stage.name}` : '—';

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
        style={{ color: 'var(--ink-1)', border: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && stages.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-20 min-w-[200px] py-1 max-h-64 overflow-y-auto"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
          >
            {stages
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => mut.mutate(s.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition-colors text-left"
                  style={{
                    color: s.id === lead.stageId ? 'var(--brand-500, #6366f1)' : 'var(--ink-1)',
                    fontWeight: s.id === lead.stageId ? 600 : 400,
                  }}
                >
                  {s.position + 1}. {s.name}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Ranking stars ───────────────────────────────────── */

function RankingCell({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const current = lead.ranking ?? 0;
  const [hover, setHover] = useState<number | null>(null);

  const mut = useMutation({
    mutationFn: (ranking: number) => updateLead(lead.id, { ranking }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['negocios'] }),
  });

  const display = hover ?? current;

  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onMouseEnter={() => setHover(i)}
          onClick={() => mut.mutate(i === current ? 0 : i)}
          className="p-0.5 transition-transform hover:scale-110"
          title={`${i} estrela${i > 1 ? 's' : ''}`}
        >
          <Star
            className="w-4 h-4"
            style={{
              color: i <= display ? '#f59e0b' : 'var(--ink-3)',
              fill: i <= display ? '#f59e0b' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Row actions ─────────────────────────────────────── */

function RowActions({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => deleteLead(lead.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['negocios'] }),
  });

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Excluir o negócio "${lead.title ?? lead.contact?.name ?? 'sem título'}"?`)) {
      mut.mutate();
    }
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
        style={{ color: 'var(--ink-2)' }}
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-500"
        style={{ color: 'var(--ink-2)' }}
        title="Excluir"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-hover)' }}
      >
        <Briefcase className="w-12 h-12" style={{ color: 'var(--brand-500, #6366f1)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
        Nenhum negócio cadastrado
      </h3>
      <p className="text-sm mb-5 max-w-sm" style={{ color: 'var(--ink-3)' }}>
        Comece cadastrando um novo negócio para acompanhar sua evolução no funil.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
        style={{ background: 'var(--brand-500, #6366f1)' }}
      >
        <Plus className="w-4 h-4" />
        Adicionar negócio
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

type ViewMode = 'lista' | 'funil' | 'mapa';

export default function Negocios() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [view, setView] = useState<ViewMode>('lista');

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

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  // Attach pipeline.stages so StageCell dropdown has options
  const leadsWithPipelineStages = useMemo(() => {
    const byId = new Map(pipelines.map((p) => [p.id, p]));
    return leads.map((l) => {
      const pipe = l.pipeline ?? byId.get(l.pipelineId);
      const fullPipe = pipe && pipe.stages ? pipe : byId.get(l.pipelineId) ?? pipe;
      return { ...l, pipeline: fullPipe };
    });
  }, [leads, pipelines]);

  const filteredLeads = useMemo(() => {
    if (!debouncedSearch) return leadsWithPipelineStages;
    return leadsWithPipelineStages.filter((l) => {
      const text = [
        l.title,
        l.contact?.name,
        l.contact?.company,
        l.contact?.email,
        l.createdBy?.name,
        l.assignedTo?.name,
        l.stage?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(debouncedSearch);
    });
  }, [leadsWithPipelineStages, debouncedSearch]);

  const total = filteredLeads.length;
  const totalValue = useMemo(
    () => filteredLeads.reduce((sum, l) => sum + Number(l.value ?? 0), 0),
    [filteredLeads],
  );

  const gridCols = '44px 1.6fr 1.4fr 1.2fr 1.2fr 1.2fr 1.4fr 1fr 1.1fr 80px';

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
            Negócios
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
            {total}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
          >
            {([
              { key: 'lista', label: 'Lista', Icon: List },
              { key: 'funil', label: 'Funil', Icon: GitBranch },
              { key: 'mapa', label: 'Mapa', Icon: MapIcon },
            ] as const).map(({ key, label, Icon }) => {
              const active = view === key;
              return (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: active ? 'var(--brand-500, #6366f1)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink-2)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
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
              placeholder="Buscar por nome do negócio, contato ou empresa"
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
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <Columns3 className="w-4 h-4" />
            Colunas
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar negócio
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        <div
          className="grid gap-3 px-6 py-3 text-xs font-bold uppercase tracking-wide"
          style={{
            gridTemplateColumns: gridCols,
            borderBottom: '1px solid var(--edge)',
            color: 'var(--ink-2)',
          }}
        >
          <div>#</div>
          <div>Nome</div>
          <div>Contato</div>
          <div>Cadastrado por</div>
          <div>Responsável</div>
          <div>Status</div>
          <div>Etapa</div>
          <div>Valor</div>
          <div>Ranking</div>
          <div></div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>
            Carregando...
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState onAdd={() => { /* TODO: open Adicionar negócio */ }} />
        ) : (
          <div>
            {filteredLeads.map((lead, idx) => {
              const contact = lead.contact;
              const createdBy = lead.createdBy ?? (lead.createdById ? userById.get(lead.createdById) : null);
              const assignedTo = lead.assignedTo ?? (lead.assignedToId ? userById.get(lead.assignedToId) : null);
              const displayName = lead.title ?? contact?.name ?? 'Sem título';

              return (
                <div
                  key={lead.id}
                  className="grid gap-3 px-6 py-3 text-sm transition-colors hover:bg-[var(--surface-hover)] cursor-pointer items-center"
                  style={{
                    gridTemplateColumns: gridCols,
                    borderBottom: '1px solid var(--edge)',
                    color: 'var(--ink-1)',
                  }}
                >
                  <div className="text-xs font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{displayName}</span>
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    {contact ? (
                      <>
                        <Avatar name={contact.name} id={contact.id} size={26} />
                        <span className="truncate" style={{ color: 'var(--ink-2)' }}>{contact.name}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    {createdBy ? (
                      <>
                        <Avatar name={createdBy.name} id={createdBy.id} size={24} />
                        <span className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{createdBy.name}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    {assignedTo ? (
                      <>
                        <Avatar name={assignedTo.name} id={assignedTo.id} size={24} />
                        <span className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{assignedTo.name}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </div>

                  <div>
                    <StatusCell lead={lead} />
                  </div>

                  <div>
                    <StageCell lead={lead} />
                  </div>

                  <div className="truncate" style={{ color: lead.value ? 'var(--ink-1)' : 'var(--ink-3)' }}>
                    {lead.value ? formatBRL(Number(lead.value)) : 'Indefinido'}
                  </div>

                  <div>
                    <RankingCell lead={lead} />
                  </div>

                  <div>
                    <RowActions lead={lead} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end text-xs" style={{ color: 'var(--ink-3)' }}>
        Exibindo {total} de {total} negócio{total !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
