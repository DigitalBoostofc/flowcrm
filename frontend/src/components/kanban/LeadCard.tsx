import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, User as UserIcon, Trophy, XCircle, Clock, Snowflake } from 'lucide-react';
import type { Lead } from '@/types/api';
import { formatBRL } from '@/lib/format';
import { scoreVisual } from '@/lib/score';
import { usePanelStore } from '@/store/panel.store';

interface Props { lead: Lead; }

const STATUS_BADGE: Record<string, { icon: typeof Trophy; color: string } | null> = {
  won:    { icon: Trophy,    color: '#10b981' },
  lost:   { icon: XCircle,  color: '#ef4444' },
  frozen: { icon: Snowflake, color: '#0ea5e9' },
  active: null,
};

function daysSinceUpdate(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function LeadCard({ lead }: Props) {
  const open = usePanelStore((s) => s.open);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    scale: isDragging ? '1.02' : undefined,
  };

  const badge = STATUS_BADGE[lead.status ?? 'active'];
  const displayName = lead.title || lead.contact?.name || 'Contato';
  const score = scoreVisual(lead.score);

  const isStale = lead.status === 'active' && lead.updatedAt
    ? daysSinceUpdate(lead.updatedAt) >= 7
    : false;

  const statusStyle = lead.status === 'won'
    ? { background: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.22)' }
    : lead.status === 'lost'
    ? { background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.14)', opacity: 0.5 }
    : lead.status === 'frozen'
    ? { background: 'rgba(14,165,233,0.05)', borderColor: 'rgba(14,165,233,0.18)' }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...statusStyle }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        open(lead.id);
      }}
      className="cursor-grab active:cursor-grabbing rounded-xl p-3 group relative overflow-hidden glass"
      onMouseEnter={(e) => {
        if (lead.status !== 'lost' && lead.status !== 'frozen') {
          (e.currentTarget as HTMLDivElement).style.transform = isDragging ? '' : 'translateY(-1px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-elevated)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Top shimmer line on hover */}
      {lead.status === 'active' && (
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      {lead.status === 'frozen' && (lead.freezeReason || lead.frozenReturnDate) && (
        <div className="mb-2 flex flex-col gap-0.5 text-[10px] rounded-md px-2 py-1" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7' }}>
          {lead.freezeReason && <span>❄ {lead.freezeReason}</span>}
          {lead.frozenReturnDate && <span>↩ {new Date(lead.frozenReturnDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate leading-snug" style={{ color: 'var(--ink-1)' }}>
            {displayName}
          </div>
          {lead.title && lead.contact?.name && (
            <div className="text-xs mt-0.5 truncate font-medium" style={{ color: 'var(--ink-2)' }}>
              {lead.contact.name}
            </div>
          )}
          {!lead.title && lead.contact?.phone && (
            <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>
              {lead.contact.phone}
            </div>
          )}
        </div>
        {badge ? (
          <badge.icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: badge.color }} />
        ) : (
          <MessageSquare
            className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors duration-150 group-hover:text-brand-500"
            style={{ color: 'var(--ink-3)' }}
          />
        )}
      </div>

      {(lead.value || lead.assignedTo || isStale || score) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {lead.value ? (
              <span className="text-xs font-mono font-semibold text-brand-500">
                {formatBRL(lead.value)}
              </span>
            ) : null}
            {score && (
              <span
                title={`${score.label} · score ${lead.score}/100`}
                className="flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                style={{ background: score.bg, color: score.fg, borderColor: score.border }}
              >
                {lead.score}
              </span>
            )}
            {isStale && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.12)', color: '#f59e0b' }}
              >
                <Clock className="w-2.5 h-2.5" />
                {daysSinceUpdate(lead.updatedAt!)}d
              </span>
            )}
          </div>
          {lead.assignedTo && (
            <span
              className="flex items-center gap-1 text-xs flex-shrink-0 font-medium"
              style={{ color: 'var(--ink-3)' }}
            >
              <UserIcon className="w-3 h-3" />
              {lead.assignedTo.name.split(' ')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
