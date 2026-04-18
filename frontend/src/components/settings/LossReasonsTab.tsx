import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { listLossReasons, createLossReason, deleteLossReason } from '@/api/loss-reasons';

export default function LossReasonsTab() {
  const qc = useQueryClient();
  const [input, setInput] = useState('');

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: listLossReasons,
  });

  const addMutation = useMutation({
    mutationFn: createLossReason,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loss-reasons'] });
      setInput('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLossReason,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loss-reasons'] }),
  });

  const handleAdd = () => {
    const label = input.trim();
    if (!label) return;
    addMutation.mutate(label);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-slate-400 text-sm">
        Defina os motivos de perda padrão da sua operação. Ao marcar um lead como{' '}
        <strong className="text-red-400">Perdido</strong>, o agente escolherá um destes motivos.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Novo motivo de perda..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending || !input.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Carregando...</div>
      ) : reasons.length === 0 ? (
        <div className="text-slate-500 text-sm">Nenhum motivo cadastrado.</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {reasons.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 last:border-0"
            >
              <span className="text-sm text-slate-200">{r.label}</span>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                disabled={deleteMutation.isPending}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
