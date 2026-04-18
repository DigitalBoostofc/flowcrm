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
      className="rounded-xl p-4 border border-white/[0.07] relative overflow-hidden group hover:border-white/[0.12] transition-all duration-200"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}
    >
      {/* Color accent top bar */}
      <div
        className="absolute top-0 inset-x-0 h-0.5 opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${stage.color}, transparent)` }}
      />

      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest truncate mb-2">
        {stage.name}
      </div>

      <div className="font-mono text-3xl font-semibold text-slate-100 leading-none">
        {count}
      </div>

      {total > 0 && (
        <div className="font-mono text-xs text-brand-500 mt-1.5 opacity-80">
          {formatBRL(total)}
        </div>
      )}
    </div>
  );
}
