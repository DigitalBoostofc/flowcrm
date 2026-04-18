import type { Lead } from '@/types/api';
import { formatBRL } from '@/lib/format';
import { MessageSquare, User as UserIcon } from 'lucide-react';
import { usePanelStore } from '@/store/panel.store';

interface Props {
  lead: Lead;
}

export default function LeadCard({ lead }: Props) {
  const open = usePanelStore((s) => s.open);

  return (
    <button
      onClick={() => open(lead.id)}
      className="w-full text-left bg-slate-700/60 hover:bg-slate-700 rounded-lg p-3 transition-colors border border-slate-600/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-slate-100 truncate">
            {lead.contact?.name ?? 'Contato'}
          </div>
          {lead.contact?.phone && (
            <div className="text-xs text-slate-400 mt-0.5">{lead.contact.phone}</div>
          )}
        </div>
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
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
    </button>
  );
}
