import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { listPipelines } from '@/api/pipelines';
import { listLeads } from '@/api/leads';
import { listUsers } from '@/api/users';
import StageSummary from '@/components/kanban/StageSummary';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import KanbanFilters from '@/components/kanban/KanbanFilters';
import { StageSummarySkeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/auth.store';
import { GitBranch } from 'lucide-react';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: pipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: user?.role === 'owner',
  });

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState<number | null>(null);

  const effectivePipelineId = selectedPipelineId
    ?? pipelines.find((p) => p.isDefault)?.id
    ?? pipelines[0]?.id
    ?? null;

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['leads', effectivePipelineId, staleDays],
    queryFn: () => listLeads(effectivePipelineId!, staleDays ?? undefined),
    enabled: !!effectivePipelineId,
  });

  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === effectivePipelineId),
    [pipelines, effectivePipelineId],
  );
  const stages = pipeline?.stages ?? [];

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.contact?.name?.toLowerCase().includes(q) || l.contact?.phone?.includes(q),
      );
    }
    if (agentId) result = result.filter((l) => l.assignedToId === agentId);
    return result;
  }, [leads, search, agentId]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, typeof filteredLeads> = {};
    for (const s of stages) map[s.id] = [];
    for (const l of filteredLeads) {
      if (map[l.stageId]) map[l.stageId].push(l);
    }
    return map;
  }, [filteredLeads, stages]);

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  if (loadingPipelines) {
    return (
      <div className="p-6 space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-7 w-32" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StageSummarySkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
          <GitBranch className="w-8 h-8" style={{ color: 'var(--ink-3)' }} />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ink-1)' }}>
          Nenhum pipeline configurado
        </h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--ink-2)' }}>
          Vá em Configurações para criar seu primeiro pipeline de vendas.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: 'var(--ink-2)' }}>{pipeline?.name}</p>
        </div>
        {pipelines.length > 1 && (
          <select
            className="select-base"
            value={effectivePipelineId ?? ''}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {loadingLeads ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(sortedStages.length || 4)].map((_, i) => <StageSummarySkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sortedStages.map((s) => (
            <StageSummary
              key={s.id}
              stage={s}
              leads={leadsByStage[s.id] ?? []}
              totalLeads={filteredLeads.length}
            />
          ))}
        </div>
      )}

      <KanbanFilters
        search={search}
        setSearch={setSearch}
        agentId={agentId}
        setAgentId={setAgentId}
        agents={agents}
        staleDays={staleDays}
        setStaleDays={setStaleDays}
      />
      <KanbanBoard stages={stages} leadsByStage={leadsByStage} pipelineId={effectivePipelineId} />
    </div>
  );
}
