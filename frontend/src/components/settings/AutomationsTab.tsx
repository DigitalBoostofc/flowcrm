import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { listPipelines } from '@/api/pipelines';
import { listAutomations, createAutomation, deleteAutomation } from '@/api/automations';
import { listChannels } from '@/api/channels';
import { listTemplates } from '@/api/templates';

export default function AutomationsTab() {
  const queryClient = useQueryClient();
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data: automations = [] } = useQuery({ queryKey: ['automations'], queryFn: listAutomations });
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: listChannels });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });

  const allStages = pipelines.flatMap((p) => (p.stages ?? []).map((s) => ({ ...s, pipelineName: p.name })));
  const [selectedStageId, setSelectedStageId] = useState<string>(allStages[0]?.id ?? '');

  const existingForSelected = automations.find((a) => a.stageId === selectedStageId);

  const [delayMinutes, setDelayMinutes] = useState(0);
  const [channelId, setChannelId] = useState('');
  const [templateId, setTemplateId] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createAutomation({
      stageId: selectedStageId,
      delayMinutes,
      channelType: 'evolution',
      channelConfigId: channelId,
      templateId,
      active: true,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  return (
    <div className="flex gap-4 min-h-[400px]">
      <aside className="w-60 bg-slate-800 rounded-xl p-3 flex-shrink-0">
        <div className="text-xs text-slate-500 uppercase mb-2 px-2">Etapas</div>
        <div className="space-y-1">
          {allStages.map((s) => {
            const has = automations.some((a) => a.stageId === s.id);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStageId(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedStageId === s.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{s.name}</span>
                  {has && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500">{s.pipelineName}</div>
              </button>
            );
          })}
          {allStages.length === 0 && <div className="text-sm text-slate-500 px-2">Crie pipelines primeiro</div>}
        </div>
      </aside>

      <main className="flex-1 bg-slate-800 rounded-xl p-5">
        {!selectedStageId ? (
          <div className="text-slate-500">Selecione uma etapa</div>
        ) : existingForSelected ? (
          <div className="space-y-3">
            <h3 className="font-semibold">Automação configurada</h3>
            <p className="text-sm text-slate-400">
              Ao entrar nesta etapa, aguardar <span className="text-amber-400">{existingForSelected.delayMinutes} minutos</span> e enviar mensagem.
            </p>
            <button
              onClick={() => deleteMutation.mutate(existingForSelected.id)}
              className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm px-3 py-1.5 rounded-lg"
            >
              <Trash2 className="w-4 h-4" /> Remover automação
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold">Nova automação</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Atraso (minutos)</label>
              <input type="number" min={0} value={delayMinutes} onChange={(e) => setDelayMinutes(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Canal</label>
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="">Selecione...</option>
                {channels.filter((c) => c.active).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Template</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="">Selecione...</option>
                {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!channelId || !templateId || createMutation.isPending}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
            >
              Salvar automação
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
