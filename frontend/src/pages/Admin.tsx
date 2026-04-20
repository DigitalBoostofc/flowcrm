import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import {
  Shield, Users, Radio, UserPlus, CreditCard, Megaphone, Flag, ScrollText, Gauge,
} from 'lucide-react';
import OverviewTab from '@/components/admin/OverviewTab';
import WorkspacesTab from '@/components/admin/WorkspacesTab';
import ChannelsTab from '@/components/admin/ChannelsTab';
import SignupsTab from '@/components/admin/SignupsTab';
import SubscriptionsTab from '@/components/admin/SubscriptionsTab';
import BroadcastsTab from '@/components/admin/BroadcastsTab';
import FeatureFlagsTab from '@/components/admin/FeatureFlagsTab';
import AuditTab from '@/components/admin/AuditTab';

type TabId = 'overview' | 'workspaces' | 'channels' | 'signups' | 'subscriptions' | 'broadcasts' | 'flags' | 'audit';

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Visão geral', icon: Gauge },
  { id: 'workspaces', label: 'Workspaces', icon: Users },
  { id: 'channels', label: 'Canais', icon: Radio },
  { id: 'signups', label: 'Cadastros', icon: UserPlus },
  { id: 'subscriptions', label: 'Assinaturas', icon: CreditCard },
  { id: 'broadcasts', label: 'Broadcasts', icon: Megaphone },
  { id: 'flags', label: 'Feature flags', icon: Flag },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
];

export default function Admin() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabId>('overview');

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--canvas)' }}>
      <header
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--brand-500)' }}
        >
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold" style={{ color: 'var(--ink-1)' }}>Admin da plataforma</h1>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Gestão global do SaaS AppexCRM</div>
        </div>
      </header>

      <div className="flex-shrink-0 px-6 flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap relative"
              style={{ color: active ? 'var(--brand-500)' : 'var(--ink-2)' }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--brand-500)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'workspaces' && <WorkspacesTab />}
        {tab === 'channels' && <ChannelsTab />}
        {tab === 'signups' && <SignupsTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'broadcasts' && <BroadcastsTab />}
        {tab === 'flags' && <FeatureFlagsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
