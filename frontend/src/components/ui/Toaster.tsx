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
          className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              if (t.leadId) openPanel(t.leadId);
              dismiss(t.id);
            }}
          >
            <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
            {t.body && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{t.body}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
