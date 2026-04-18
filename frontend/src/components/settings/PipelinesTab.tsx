import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { listPipelines, createPipeline, deletePipeline } from '@/api/pipelines';
import { createStage } from '@/api/stages';
import Modal from '@/components/ui/Modal';

export default function PipelinesTab() {
  const queryClient = useQueryClient();
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState('');
  const [stageFor, setStageFor] = useState<string | null>(null);
  const [stageName, setStageName] = useState('');

  const createPipelineMutation = useMutation({
    mutationFn: (dto: { name: string; isDefault: boolean }) => createPipeline(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      setNewPipelineOpen(false);
      setPipelineName('');
    },
  });

  const deletePipelineMutation = useMutation({
    mutationFn: deletePipeline,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const createStageMutation = useMutation({
    mutationFn: ({ pipelineId, name }: { pipelineId: string; name: string }) =>
      createStage(pipelineId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      setStageFor(null);
      setStageName('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pipelines</h3>
        <button
          onClick={() => setNewPipelineOpen(true)}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Novo Pipeline
        </button>
      </div>

      <div className="space-y-3">
        {pipelines.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-slate-100">
                  {p.name} {p.isDefault && <span className="text-xs text-emerald-400 ml-2">(padrão)</span>}
                </div>
                <div className="text-xs text-slate-500">{p.stages?.length ?? 0} etapas</div>
              </div>
              <button
                onClick={() => confirm(`Excluir pipeline ${p.name}?`) && deletePipelineMutation.mutate(p.id)}
                className="text-slate-500 hover:text-red-400 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...(p.stages ?? [])].sort((a, b) => a.position - b.position).map((s) => (
                <span key={s.id} className="bg-slate-700 rounded px-2 py-1 text-xs" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
                  {s.name}
                </span>
              ))}
              <button
                onClick={() => setStageFor(p.id)}
                className="text-xs text-slate-400 hover:text-white border border-dashed border-slate-600 rounded px-2 py-1"
              >
                + etapa
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={newPipelineOpen} onClose={() => setNewPipelineOpen(false)} title="Novo pipeline">
        <div className="space-y-3">
          <input
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="Nome do pipeline (ex: Vendas)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setNewPipelineOpen(false)} className="px-3 py-1.5 text-sm text-slate-400">Cancelar</button>
            <button
              onClick={() => createPipelineMutation.mutate({ name: pipelineName, isDefault: pipelines.length === 0 })}
              disabled={!pipelineName.trim()}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg"
            >
              Criar
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={stageFor !== null} onClose={() => setStageFor(null)} title="Nova etapa">
        <div className="space-y-3">
          <input
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="Nome da etapa (ex: Qualificação)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setStageFor(null)} className="px-3 py-1.5 text-sm text-slate-400">Cancelar</button>
            <button
              onClick={() => stageFor && createStageMutation.mutate({ pipelineId: stageFor, name: stageName })}
              disabled={!stageName.trim()}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg"
            >
              Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
