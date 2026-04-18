import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, CircleDot, XCircle } from 'lucide-react';
import { updateLeadStatus } from '@/api/leads';
import type { Lead, LeadStatus } from '@/types/api';
import Modal from '@/components/ui/Modal';

interface Props {
  lead: Lead;
}

const STATUS_CONFIG = {
  active: { label: 'Em andamento', icon: CircleDot, color: 'text-slate-400 bg-slate-700' },
  won: { label: 'Ganho', icon: Trophy, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  lost: { label: 'Perdido', icon: XCircle, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
} as const;

export default function StatusToggle({ lead }: Props) {
  const qc = useQueryClient();
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossReason, setLossReason] = useState('');

  const mutation = useMutation({
    mutationFn: ({ status, reason }: { status: LeadStatus; reason?: string }) =>
      updateLeadStatus(lead.id, status, reason),
    onSuccess: (updated) => {
      qc.setQueryData<Lead>(['lead', lead.id], updated);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const handleClick = (status: LeadStatus) => {
    if (status === lead.status) return;
    if (status === 'lost') {
      setLossReason('');
      setShowLossModal(true);
      return;
    }
    mutation.mutate({ status });
  };

  const confirmLoss = () => {
    mutation.mutate({ status: 'lost', reason: lossReason });
    setShowLossModal(false);
  };

  return (
    <>
      <div className="flex gap-1 p-1 bg-slate-900/50 rounded-lg border border-slate-700">
        {(['active', 'won', 'lost'] as LeadStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const active = lead.status === s;
          return (
            <button
              key={s}
              onClick={() => handleClick(s)}
              disabled={mutation.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                active ? cfg.color + ' border-current/20' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <Modal open={showLossModal} onClose={() => setShowLossModal(false)} title="Motivo da perda">
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-400">Descreva brevemente por que este lead foi perdido.</p>
          <input
            autoFocus
            type="text"
            placeholder="Ex: Preço, concorrente, sem interesse..."
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmLoss()}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowLossModal(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={confirmLoss}
              className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              Confirmar perda
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
