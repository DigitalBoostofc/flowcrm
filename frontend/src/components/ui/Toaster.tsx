import { X, MessageCircle } from 'lucide-react';
import { useToastStore } from '@/store/toast.store';
import { usePanelStore } from '@/store/panel.store';

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();
  const openPanel = usePanelStore(s => s.open);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl animate-fade-up"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--edge-strong)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'var(--brand-50)' }}
          >
            <MessageCircle className="w-4 h-4" style={{ color: 'var(--brand-500)' }} strokeWidth={2} />
          </div>

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => { if (t.leadId) openPanel(t.leadId); dismiss(t.id); }}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>{t.title}</p>
            {t.body && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--ink-3)' }}>{t.body}</p>
            )}
          </div>

          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 transition-colors mt-0.5"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Dispensar"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
