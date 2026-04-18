import { differenceInDays, differenceInHours } from 'date-fns';
import type { Lead, Stage } from '@/types/api';

interface Props {
  lead: Lead;
  stages: Stage[];
}

function elapsed(since: string): string {
  const d = differenceInDays(new Date(), new Date(since));
  if (d >= 1) return `${d}d`;
  const h = differenceInHours(new Date(), new Date(since));
  return h < 1 ? '<1h' : `${h}h`;
}

export default function StageProgress({ lead, stages }: Props) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const currentIdx = sorted.findIndex((s) => s.id === lead.stageId);

  return (
    <div className="px-4 py-3 border-b border-slate-700/50">
      <div className="flex items-center gap-0">
        {sorted.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isCurrent ? 'bg-brand-500 ring-2 ring-brand-500/30' :
                    isDone ? 'bg-slate-500' : 'bg-slate-700 border border-slate-600'
                  }`}
                />
                <span className={`text-[10px] mt-1 truncate max-w-full text-center ${
                  isCurrent ? 'text-brand-400 font-medium' :
                  isDone ? 'text-slate-500' : 'text-slate-600'
                }`}>
                  {stage.name}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {elapsed(lead.stageEnteredAt)}
                  </span>
                )}
              </div>
              {i < sorted.length - 1 && (
                <div className={`h-px flex-1 mx-1 ${i < currentIdx ? 'bg-slate-500' : 'bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
