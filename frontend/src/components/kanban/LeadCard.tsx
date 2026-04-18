import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, User as UserIcon, Trophy, XCircle } from 'lucide-react';
import type { Lead } from '@/types/api';
import { formatBRL } from '@/lib/format';
import { usePanelStore } from '@/store/panel.store';

interface Props { lead: Lead; }

const STATUS_BADGE = {
  won: { icon: Trophy, color: '#10b981', label: 'Ganho' },
  lost: { icon: XCircle, color: '#ef4444', label: 'Perdido' },
  active: null,
} as const;

export default function LeadCard({ lead }: Props) {
  const open = usePanelStore((s) => s.open);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const badge = STATUS_BADGE[lead.status ?? 'active'];
  const displayName = lead.title || lead.contact?.name || 'Contato';

  const wonStyle = lead.status === 'won'
    ? { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }
    : lead.status === 'lost'
    ? { background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)', opacity: 0.55 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...wonStyle }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        open(lead.id);
      }}
      className="cursor-grab active:cursor-grabbing rounded-xl p-3 transition-all duration-150 group relative overflow-hidden glass hover:shadow-md"
    >
      {/* Subtle top shimmer on hover for active leads */}
      {lead.status === 'active' && (
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate leading-snug" style={{ color: 'var(--ink-1)' }}>
            {displayName}
          </div>
          {lead.title && lead.contact?.name && (
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>{lead.contact.name}</div>
          )}
          {!lead.title && lead.contact?.phone && (
            <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>{lead.contact.phone}</div>
          )}
        </div>
        {badge ? (
          <badge.icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: badge.color }} />
        ) : (
          <MessageSquare
            className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors group-hover:text-brand-500"
            style={{ color: 'var(--ink-3)' }}
          />
        )}
      </div>

      {(lead.value || lead.assignedTo) && (
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-brand-500">
            {formatBRL(lead.value)}
          </span>
          {lead.assignedTo && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}>
              <UserIcon className="w-3 h-3" />
              {lead.assignedTo.name.split(' ')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
