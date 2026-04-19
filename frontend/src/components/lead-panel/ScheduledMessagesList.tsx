import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, X } from 'lucide-react';
import { listScheduled, cancelScheduled } from '@/api/scheduler';

export default function ScheduledMessagesList({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const { data: scheduled = [] } = useQuery({
    queryKey: ['scheduled', conversationId],
    queryFn: () => listScheduled(conversationId),
  });

  const pending = scheduled.filter((s) => s.status === 'pending');

  const cancelMutation = useMutation({
    mutationFn: cancelScheduled,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled', conversationId] }),
  });

  if (pending.length === 0) return null;

  return (
    <div className="px-3 pt-2 pb-1" style={{ background: 'var(--surface)', borderTop: '1px solid var(--edge)' }}>
      <div className="text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
        <Clock className="w-3 h-3" /> Agendadas ({pending.length})
      </div>
      <div className="space-y-1.5">
        {pending.map((s) => (
          <div
            key={s.id}
            className="rounded-lg p-2 flex items-start gap-2"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium" style={{ color: 'var(--warning)' }}>
                {format(new Date(s.scheduledAt), 'dd/MM HH:mm')}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--ink-2)' }}>{s.body}</div>
            </div>
            <button
              onClick={() => cancelMutation.mutate(s.id)}
              disabled={cancelMutation.isPending}
              title="Cancelar"
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--ink-3)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
