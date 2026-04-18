import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import PipelinesTab from '@/components/settings/PipelinesTab';
import ChannelsTab from '@/components/settings/ChannelsTab';
import AgentsTab from '@/components/settings/AgentsTab';
import AutomationsTab from '@/components/settings/AutomationsTab';
import TemplatesTab from '@/components/settings/TemplatesTab';
import LossReasonsTab from '@/components/settings/LossReasonsTab';

type Tab = 'pipelines' | 'channels' | 'agents' | 'automations' | 'templates' | 'loss-reasons';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pipelines', label: 'Pipelines' },
  { id: 'channels', label: 'Canais' },
  { id: 'agents', label: 'Agentes' },
  { id: 'automations', label: 'Automações' },
  { id: 'templates', label: 'Templates' },
  { id: 'loss-reasons', label: 'Motivos de Perda' },
];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('pipelines');

  if (user?.role !== 'owner') return <Navigate to="/" replace />;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-5">Configurações</h1>
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'pipelines' && <PipelinesTab />}
      {tab === 'channels' && <ChannelsTab />}
      {tab === 'agents' && <AgentsTab />}
      {tab === 'automations' && <AutomationsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'loss-reasons' && <LossReasonsTab />}
    </div>
  );
}
