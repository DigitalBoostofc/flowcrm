import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { listPipelines } from '@/api/pipelines';
import { listLeads } from '@/api/leads';
import { listUsers } from '@/api/users';
import StageSummary from '@/components/kanban/StageSummary';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import KanbanFilters from '@/components/kanban/KanbanFilters';
import { useAuthStore } from '@/store/auth.store';

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

  const { data: leads = [] } = useQuery({
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

  if (loadingPipelines) return <div className="p-8 text-slate-400">Carregando...</div>;

  if (pipelines.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Nenhum pipeline configurado</h1>
        <p className="text-slate-400 mt-2">Vá em Configurações para criar seu primeiro pipeline de vendas.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{pipeline?.name}</p>
        </div>
        {pipelines.length > 1 && (
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            value={effectivePipelineId ?? ''}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...stages].sort((a, b) => a.position - b.position).map((s) => (
          <StageSummary key={s.id} stage={s} leads={leadsByStage[s.id] ?? []} />
        ))}
      </div>
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
