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
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/40" onClick={close} aria-hidden />
        <aside
          className="w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes do lead"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
            <div className="flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                    tab === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <button
              onClick={close}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
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
