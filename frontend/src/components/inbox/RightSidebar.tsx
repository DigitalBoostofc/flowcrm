import { useState } from 'react';
import { Activity, FileText } from 'lucide-react';
import LeadActivities from '@/components/lead-panel/LeadActivities';
import InboxDataTab from '@/components/lead-panel/InboxDataTab';

type SidebarTab = 'activities' | 'info';

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: React.ElementType }[] = [
  { id: 'activities', label: 'Atividades', icon: Activity },
  { id: 'info', label: 'Dados', icon: FileText },
];

interface Props {
  leadId: string;
  conversationId: string;
}

export default function RightSidebar({ leadId, conversationId: _conversationId }: Props) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('activities');

  return (
    <div
      className="w-80 flex-shrink-0 flex flex-col h-full"
      style={{ borderLeft: '1px solid var(--edge)', background: 'var(--surface)' }}
    >
      {/* Tab switcher */}
      <div
        className="flex gap-1 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--edge)' }}
      >
        {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              activeTab === id
                ? { background: 'var(--panel-bg, var(--canvas))', color: 'var(--ink-1)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                : { color: 'var(--ink-3)' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'activities' && <LeadActivities leadId={leadId} />}
        {activeTab === 'info' && <InboxDataTab leadId={leadId} />}
      </div>
    </div>
  );
}
