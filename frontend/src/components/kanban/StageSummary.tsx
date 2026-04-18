import type { Stage, Lead } from '@/types/api';
import { formatBRL } from '@/lib/format';

interface Props {
  stage: Stage;
  leads: Lead[];
  totalLeads?: number;
}

export default function StageSummary({ stage, leads, totalLeads }: Props) {
  const count = leads.length;
  const total = leads.reduce((sum, l) => sum + Number(l.value ?? 0), 0);
  const pct = totalLeads && totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

  return (
    <div
      className="glass rounded-xl p-4 relative overflow-hidden group cursor-default"
      style={{ transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px ${stage.color}33`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Color accent top bar */}
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: stage.color, opacity: 0.8 }}
      />

      {/* Subtle glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${stage.color}08, transparent 70%)` }}
      />

      <div className="text-[10px] font-semibold uppercase tracking-widest truncate mb-3" style={{ color: 'var(--ink-3)' }}>
        {stage.name}
      </div>

      <div className="flex items-end justify-between gap-2 mb-3">
        <div className="font-mono text-3xl font-bold leading-none" style={{ color: 'var(--ink-1)' }}>
          {count}
        </div>
        {pct > 0 && (
          <div className="text-xs font-medium mb-0.5" style={{ color: stage.color }}>
            {pct}%
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-2.5" style={{ background: 'var(--edge)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: stage.color }}
        />
      </div>

      {total > 0 && (
        <div className="font-mono text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
          {formatBRL(total)}
        </div>
      )}
    </div>
  );
}
