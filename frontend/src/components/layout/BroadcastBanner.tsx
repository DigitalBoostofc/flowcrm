import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, X, AlertOctagon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { listActiveBroadcasts } from '@/api/platform';
import type { BroadcastSeverity } from '@/api/platform';

const DISMISSED_KEY = 'flowcrm-dismissed-broadcasts';

const STYLES: Record<BroadcastSeverity, { bg: string; fg: string; icon: any }> = {
  info: { bg: '#dbeafe', fg: '#1e40af', icon: Info },
  warning: { bg: '#fef3c7', fg: '#92400e', icon: AlertTriangle },
  critical: { bg: '#fee2e2', fg: '#991b1b', icon: AlertOctagon },
};

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export default function BroadcastBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const { data: broadcasts = [] } = useQuery({
    queryKey: ['active-broadcasts'],
    queryFn: listActiveBroadcasts,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const ids = new Set(broadcasts.map((b) => b.id));
    const cleaned = new Set(Array.from(dismissed).filter((id) => ids.has(id)));
    if (cleaned.size !== dismissed.size) {
      setDismissed(cleaned);
      saveDismissed(cleaned);
    }
  }, [broadcasts]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = broadcasts.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="flex-shrink-0">
      {visible.map((b) => {
        const style = STYLES[b.severity] ?? STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={b.id}
            className="flex items-start gap-3 px-4 py-2.5 text-sm"
            style={{ background: style.bg, color: style.fg, borderBottom: `1px solid ${style.fg}20` }}
          >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{b.title}</div>
              <div className="text-xs opacity-90">{b.body}</div>
            </div>
            <button
              onClick={() => dismiss(b.id)}
              className="p-1 rounded hover:bg-black/10 flex-shrink-0"
              aria-label="Dispensar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
