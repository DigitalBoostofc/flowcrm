import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, User as UserIcon, Trophy, XCircle } from 'lucide-react';
import type { Lead } from '@/types/api';
import { formatBRL } from '@/lib/format';
import { usePanelStore } from '@/store/panel.store';

interface Props { lead: Lead; }

const STATUS_BADGE = {
  won: { icon: Trophy, cls: 'text-emerald-400', label: 'Ganho' },
  lost: { icon: XCircle, cls: 'text-red-400', label: 'Perdido' },
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

  const cardBase =
    'cursor-grab active:cursor-grabbing rounded-xl p-3 transition-all duration-150 border group relative overflow-hidden';

  const cardVariant =
    lead.status === 'won'
      ? 'bg-emerald-950/40 border-emerald-800/30 hover:border-emerald-700/50'
      : lead.status === 'lost'
      ? 'bg-red-950/20 border-red-900/20 opacity-50 hover:opacity-60'
      : 'border-white/[0.07] hover:border-brand-500/30'

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background:
          lead.status === 'won'
            ? undefined
            : lead.status === 'lost'
            ? undefined
            : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        open(lead.id);
      }}
      className={`${cardBase} ${cardVariant}`}
    >
      {/* Amber glow accent on hover */}
      {lead.status === 'active' && (
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-slate-200 truncate leading-snug">{displayName}</div>
          {lead.title && lead.contact?.name && (
            <div className="text-xs text-slate-500 mt-0.5 truncate">{lead.contact.name}</div>
          )}
          {!lead.title && lead.contact?.phone && (
            <div className="text-xs text-slate-600 mt-0.5 font-mono">{lead.contact.phone}</div>
          )}
        </div>
        {badge ? (
          <badge.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${badge.cls}`} />
        ) : (
          <MessageSquare className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 mt-0.5 group-hover:text-brand-500/60 transition-colors" />
        )}
      </div>

      {(lead.value || lead.assignedTo) && (
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-brand-500">
            {formatBRL(lead.value)}
          </span>
          {lead.assignedTo && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <UserIcon className="w-3 h-3" />
              {lead.assignedTo.name.split(' ')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
