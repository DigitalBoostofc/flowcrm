import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitBranch, XCircle, Users2, Tags, Building2, Radio, FileText,
  Zap, User as UserIcon, Puzzle, Server, AlertTriangle, Package,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspace } from '@/hooks/useWorkspace';
import FunisEtapasTab from '@/components/settings/FunisEtapasTab';
import MotivosPerdaTab from '@/components/settings/MotivosPerdaTab';
import OrigensClientesTab from '@/components/settings/OrigensClientesTab';
import CategoriasClientesTab from '@/components/settings/CategoriasClientesTab';
import SetoresTab from '@/components/settings/SetoresTab';
import ChannelsTab from '@/components/settings/ChannelsTab';
import AgentsTab from '@/components/settings/AgentsTab';
import AutomationsTab from '@/components/settings/AutomationsTab';
import TemplatesTab from '@/components/settings/TemplatesTab';
import IntegrationsTab from '@/components/settings/IntegrationsTab';
import SistemaTab from '@/components/settings/SistemaTab';
import DangerZoneTab from '@/components/settings/DangerZoneTab';
import ProdutosServicosTab from '@/components/settings/ProdutosServicosTab';

type Tab =
  | 'funis-etapas' | 'motivos-perda' | 'origens-clientes'
  | 'categorias-clientes' | 'setores' | 'produtos-servicos' | 'channels'
  | 'templates' | 'automations' | 'agents' | 'integrations' | 'sistema' | 'danger';

interface NavItem { id: Tab; label: string; icon: typeof GitBranch; ownerOnly?: boolean; platformAdminOnly?: boolean; danger?: boolean }
interface NavGroup { title: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  {
    title: 'Funis & negócios',
    items: [
      { id: 'funis-etapas',         label: 'Funis e etapas',        icon: GitBranch,  ownerOnly: true },
      { id: 'motivos-perda',        label: 'Motivos de perda',      icon: XCircle,    ownerOnly: true },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { id: 'origens-clientes',     label: 'Origens de clientes',   icon: Users2,     ownerOnly: true },
      { id: 'categorias-clientes',  label: 'Categorias',            icon: Tags,       ownerOnly: true },
      { id: 'produtos-servicos',    label: 'Produtos e serviços',   icon: Package,    ownerOnly: true },
    ],
  },
  {
    title: 'Empresas',
    items: [
      { id: 'setores',              label: 'Setores',               icon: Building2,  ownerOnly: true },
    ],
  },
  {
    title: 'Comunicação & automação',
    items: [
      { id: 'channels',             label: 'Canais WhatsApp',       icon: Radio,      ownerOnly: true },
      { id: 'templates',            label: 'Templates',             icon: FileText,   ownerOnly: true },
      { id: 'automations',          label: 'Automações',            icon: Zap,        ownerOnly: true },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { id: 'agents',               label: 'Agentes',               icon: UserIcon,   ownerOnly: true },
    ],
  },
  {
    title: 'Integrações',
    items: [
      { id: 'integrations',         label: 'Google Calendar',       icon: Puzzle },
    ],
  },
  {
    title: 'Administração',
    items: [
      { id: 'sistema',              label: 'Sistema',               icon: Server,        platformAdminOnly: true },
      { id: 'danger',               label: 'Zona de perigo',        icon: AlertTriangle, ownerOnly: true, danger: true },
    ],
  },
];

export default function Settings() {
  const user = useAuthStore(s => s.user);
  const isOwner = user?.role === 'owner';
  const { data: workspace } = useWorkspace();
  const isPlatformAdmin = workspace?.isPlatformAdmin === true;
  const [params, setParams] = useSearchParams();

  const tabFromUrl = params.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(tabFromUrl ?? (isOwner ? 'funis-etapas' : 'integrations'));

  // Sincroniza tab com URL (OAuth callback retorna ?tab=integrations)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab) setTab(tabFromUrl);
  }, [tabFromUrl]);

  const changeTab = (id: Tab) => {
    setTab(id);
    setParams(p => { p.set('tab', id); return p; }, { replace: true });
  };

  const visibleGroups = GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => {
      if (i.platformAdminOnly) return isPlatformAdmin;
      if (i.ownerOnly) return isOwner;
      return true;
    }),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 overflow-y-auto"
        style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--edge)' }}
      >
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            Configurações
          </h1>
        </div>

        <nav className="px-3 pb-6 space-y-4">
          {visibleGroups.map(group => (
            <div key={group.title}>
              <div
                className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--ink-3)' }}
              >
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon, danger }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => changeTab(id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors"
                      style={{
                        background: active ? (danger ? 'var(--danger-bg)' : 'var(--brand-50)') : 'transparent',
                        color: danger ? 'var(--danger)' : active ? 'var(--brand-500)' : 'var(--ink-2)',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2 : 1.75} />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-8 py-7 max-w-3xl">
          {tab === 'funis-etapas'        && <FunisEtapasTab />}
          {tab === 'motivos-perda'       && <MotivosPerdaTab />}
          {tab === 'origens-clientes'    && <OrigensClientesTab />}
          {tab === 'categorias-clientes' && <CategoriasClientesTab />}
          {tab === 'setores'             && <SetoresTab />}
          {tab === 'produtos-servicos'   && <ProdutosServicosTab />}
          {tab === 'channels'            && <ChannelsTab />}
          {tab === 'templates'           && <TemplatesTab />}
          {tab === 'automations'         && <AutomationsTab />}
          {tab === 'agents'              && <AgentsTab />}
          {tab === 'integrations'        && <IntegrationsTab />}
          {tab === 'sistema'             && <SistemaTab />}
          {tab === 'danger'              && <DangerZoneTab />}
        </div>
      </div>
    </div>
  );
}
