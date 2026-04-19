import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  GitBranch, XCircle, Users2, Tags, Building2, Radio, FileText, Zap, User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import FunisEtapasTab from '@/components/settings/FunisEtapasTab';
import MotivosPerdaTab from '@/components/settings/MotivosPerdaTab';
import OrigensClientesTab from '@/components/settings/OrigensClientesTab';
import CategoriasClientesTab from '@/components/settings/CategoriasClientesTab';
import SetoresTab from '@/components/settings/SetoresTab';
import ChannelsTab from '@/components/settings/ChannelsTab';
import AgentsTab from '@/components/settings/AgentsTab';
import AutomationsTab from '@/components/settings/AutomationsTab';
import TemplatesTab from '@/components/settings/TemplatesTab';

type Tab =
  | 'funis-etapas'
  | 'motivos-perda'
  | 'origens-clientes'
  | 'categorias-clientes'
  | 'setores'
  | 'channels'
  | 'templates'
  | 'automations'
  | 'agents';

interface NavItem {
  id: Tab;
  label: string;
  icon: typeof GitBranch;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: 'Funis & negócios',
    items: [
      { id: 'funis-etapas', label: 'Funis e etapas', icon: GitBranch },
      { id: 'motivos-perda', label: 'Motivos de perda', icon: XCircle },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { id: 'origens-clientes', label: 'Origens de clientes', icon: Users2 },
      { id: 'categorias-clientes', label: 'Categorias de clientes', icon: Tags },
    ],
  },
  {
    title: 'Empresas',
    items: [
      { id: 'setores', label: 'Setores', icon: Building2 },
    ],
  },
  {
    title: 'Comunicação & automação',
    items: [
      { id: 'channels', label: 'Canais', icon: Radio },
      { id: 'templates', label: 'Templates', icon: FileText },
      { id: 'automations', label: 'Automações', icon: Zap },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { id: 'agents', label: 'Agentes', icon: UserIcon },
    ],
  },
];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('funis-etapas');

  if (user?.role !== 'owner') return <Navigate to="/" replace />;

  return (
    <div className="flex h-full min-h-screen">
      <aside
        className="flex-shrink-0 overflow-y-auto"
        style={{
          width: 256,
          background: 'var(--surface)',
          borderRight: '1px solid var(--edge)',
        }}
      >
        <div className="px-5 py-5">
          <h1 className="text-lg font-bold" style={{ color: 'var(--ink-1)' }}>
            Configurações
          </h1>
        </div>
        <nav className="px-3 pb-6 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div
                className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--ink-3)' }}
              >
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                        color: active ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-8 py-8 max-w-5xl">
          {tab === 'funis-etapas' && <FunisEtapasTab />}
          {tab === 'motivos-perda' && <MotivosPerdaTab />}
          {tab === 'origens-clientes' && <OrigensClientesTab />}
          {tab === 'categorias-clientes' && <CategoriasClientesTab />}
          {tab === 'setores' && <SetoresTab />}
          {tab === 'channels' && <ChannelsTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'automations' && <AutomationsTab />}
          {tab === 'agents' && <AgentsTab />}
        </div>
      </div>
    </div>
  );
}
