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
    <div className="glass rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-all duration-200">
      {/* Color accent top bar */}
      <div
        className="absolute top-0 inset-x-0 h-0.5 opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${stage.color}, transparent)` }}
      />

      <div className="text-[10px] font-medium uppercase tracking-widest truncate mb-2" style={{ color: 'var(--ink-3)' }}>
        {stage.name}
      </div>

      <div className="font-mono text-3xl font-semibold leading-none" style={{ color: 'var(--ink-1)' }}>
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
