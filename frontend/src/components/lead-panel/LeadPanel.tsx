import { useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { X, MessageCircle, FileText } from 'lucide-react';
import { usePanelStore } from '@/store/panel.store';
import LeadInfo from './LeadInfo';

type Tab = 'chat' | 'info';

export default function LeadPanel() {
  const { isOpen, selectedLeadId, close } = usePanelStore();
  const [tab, setTab] = useState<Tab>('chat');

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

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true }}>
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/40" onClick={close} aria-hidden />
        <aside className="w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-label="Detalhes do lead">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex gap-1">
              <button
                onClick={() => setTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${tab === 'chat' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <MessageCircle className="w-4 h-4" /> Chat
              </button>
              <button
                onClick={() => setTab('info')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${tab === 'info' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText className="w-4 h-4" /> Dados
              </button>
            </div>
            <button onClick={close} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {tab === 'chat' && <div className="p-4 text-slate-500 text-sm">Chat — Task 9</div>}
            {tab === 'info' && <LeadInfo leadId={selectedLeadId} />}
          </div>
        </aside>
      </div>
    </FocusTrap>
  );
}
