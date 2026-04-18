import { useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { X, MessageCircle, FileText, Activity } from 'lucide-react';
import { usePanelStore } from '@/store/panel.store';
import { useQuery } from '@tanstack/react-query';
import { listPipelines } from '@/api/pipelines';
import LeadInfo from './LeadInfo';
import LeadChat from './LeadChat';
import LeadActivities from './LeadActivities';

type Tab = 'chat' | 'activities' | 'info';

export default function LeadPanel() {
  const { isOpen, selectedLeadId, close } = usePanelStore();
  const [tab, setTab] = useState<Tab>('chat');

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
    enabled: isOpen,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) setTab('chat');
  }, [isOpen, selectedLeadId]);

  if (!isOpen || !selectedLeadId) return null;

  const allStages = pipelines.flatMap((p) => p.stages ?? []);

  const TABS = [
    { id: 'chat' as Tab, label: 'Chat', icon: MessageCircle },
    { id: 'activities' as Tab, label: 'Atividades', icon: Activity },
    { id: 'info' as Tab, label: 'Dados', icon: FileText },
  ];

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true }}>
      <div className="fixed inset-0 z-40 flex animate-fade-up" style={{ animationDuration: '0.2s' }}>
        <div
          className="flex-1"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={close}
          aria-hidden
        />
        <aside
          className="w-full max-w-md shadow-2xl flex flex-col animate-slide-in panel-bg"
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes do lead"
        >
          {/* Tab bar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--panel-border)' }}
          >
            <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: 'var(--panel-surface)' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={
                    tab === id
                      ? {
                          background: 'var(--panel-bg)',
                          color: 'var(--ink-1)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        }
                      : { color: 'var(--ink-3)' }
                  }
                  onMouseEnter={(e) => {
                    if (tab !== id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)';
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: 'var(--ink-3)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-1)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel-surface)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              aria-label="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {tab === 'chat' && <LeadChat leadId={selectedLeadId} />}
            {tab === 'activities' && <LeadActivities leadId={selectedLeadId} />}
            {tab === 'info' && <LeadInfo leadId={selectedLeadId} stages={allStages} />}
          </div>
        </aside>
      </div>
    </FocusTrap>
  );
}
