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
    opacity: isDragging ? 0.4 : 1,
  };

  const badge = STATUS_BADGE[lead.status ?? 'active'];
  const displayName = lead.title || lead.contact?.name || 'Contato';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        open(lead.id);
      }}
      className={`cursor-grab active:cursor-grabbing rounded-lg p-3 transition-colors border ${
        lead.status === 'won'
          ? 'bg-emerald-900/20 border-emerald-700/30 hover:bg-emerald-900/30'
          : lead.status === 'lost'
          ? 'bg-red-900/20 border-red-700/30 hover:bg-red-900/30 opacity-60'
          : 'bg-slate-700/60 hover:bg-slate-700 border-slate-600/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-slate-100 truncate">{displayName}</div>
          {lead.title && lead.contact?.name && (
            <div className="text-xs text-slate-400 mt-0.5">{lead.contact.name}</div>
          )}
          {!lead.title && lead.contact?.phone && (
            <div className="text-xs text-slate-400 mt-0.5">{lead.contact.phone}</div>
          )}
        </div>
        {badge ? (
          <badge.icon className={`w-3.5 h-3.5 flex-shrink-0 ${badge.cls}`} />
        ) : (
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-emerald-400 font-medium">{formatBRL(lead.value)}</span>
        {lead.assignedTo && (
          <span className="flex items-center gap-1 text-slate-400">
            <UserIcon className="w-3 h-3" />
            {lead.assignedTo.name.split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  );
}
