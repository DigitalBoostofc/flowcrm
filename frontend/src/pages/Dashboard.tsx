import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { listPipelines } from '@/api/pipelines';
import { listLeads } from '@/api/leads';
import StageSummary from '@/components/kanban/StageSummary';

export default function Dashboard() {
  const { data: pipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
  });

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const effectivePipelineId = selectedPipelineId
    ?? pipelines.find((p) => p.isDefault)?.id
    ?? pipelines[0]?.id
    ?? null;

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', effectivePipelineId],
    queryFn: () => listLeads(effectivePipelineId!),
    enabled: !!effectivePipelineId,
  });

  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === effectivePipelineId),
    [pipelines, effectivePipelineId],
  );
  const stages = pipeline?.stages ?? [];
  const leadsByStage = useMemo(() => {
    const map: Record<string, typeof leads> = {};
    for (const s of stages) map[s.id] = [];
    for (const l of leads) {
      if (map[l.stageId]) map[l.stageId].push(l);
    }
    return map;
  }, [leads, stages]);

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
      <div className="bg-slate-800 rounded-xl p-6 text-slate-400 text-sm">
        Kanban (colunas + cards) — Task 6
      </div>
    </div>
  );
}
