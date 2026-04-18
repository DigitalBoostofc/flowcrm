import type { Stage, Lead } from '@/types/api';
import { formatBRL } from '@/lib/format';

interface Props {
  stage: Stage;
  leads: Lead[];
}

export default function StageSummary({ stage, leads }: Props) {
  const count = leads.length;
  const total = leads.reduce((sum, l) => sum + Number(l.value ?? 0), 0);

  return (
    <div
      className="bg-slate-800 rounded-xl p-4 border-l-4"
      style={{ borderLeftColor: stage.color }}
    >
      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{stage.name}</div>
      <div className="text-2xl font-bold text-white mt-1">{count}</div>
      <div className="text-xs text-slate-500">{formatBRL(total)}</div>
    </div>
  );
}
