import { X, MessageCircle } from 'lucide-react';
import { useToastStore } from '@/store/toast.store';
import { usePanelStore } from '@/store/panel.store';

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();
  const openPanel = usePanelStore((s) => s.open);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass-raised rounded-xl p-4 flex items-start gap-3 animate-fade-up"
        >
          <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              if (t.leadId) openPanel(t.leadId);
              dismiss(t.id);
            }}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>{t.title}</p>
            {t.body && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--ink-2)' }}>{t.body}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 transition-colors hover:text-[var(--ink-1)]"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
