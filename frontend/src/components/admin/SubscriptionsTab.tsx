import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { listWorkspaces } from '@/api/platform';

export default function SubscriptionsTab() {
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['platform-workspaces', ''],
    queryFn: () => listWorkspaces(),
  });

  const now = new Date();
  const trialExpiring = workspaces
    .filter((w) => w.subscriptionStatus === 'trial')
    .map((w) => ({ ...w, daysLeft: differenceInDays(new Date(w.trialEndsAt), now) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const paying = workspaces.filter((w) => w.subscriptionStatus === 'active');
  const churned = workspaces.filter((w) => w.subscriptionStatus === 'canceled' || w.subscriptionStatus === 'expired');

  return (
    <div className="space-y-6 max-w-6xl">
      <Section title="Trials prestes a expirar" icon={AlertTriangle} iconColor="#f59e0b">
        {isLoading && <div className="text-xs py-3" style={{ color: 'var(--ink-3)' }}>Carregando...</div>}
        {!isLoading && trialExpiring.length === 0 && <div className="text-xs py-3" style={{ color: 'var(--ink-3)' }}>Nenhum trial ativo</div>}
        {trialExpiring.map((w) => (
          <Row key={w.id}>
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{w.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{w.ownerEmail}</div>
            </div>
            <div
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: w.daysLeft < 0 ? '#fee2e2' : w.daysLeft < 3 ? '#fef3c7' : '#f1f5f9',
                color: w.daysLeft < 0 ? '#991b1b' : w.daysLeft < 3 ? '#a16207' : '#475569',
              }}
            >
              {w.daysLeft < 0 ? `expirou há ${-w.daysLeft}d` : w.daysLeft === 0 ? 'expira hoje' : `${w.daysLeft}d restantes`}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{format(new Date(w.trialEndsAt), 'dd/MM/yyyy')}</div>
          </Row>
        ))}
      </Section>

      <Section title="Pagantes" icon={DollarSign} iconColor="#22c55e">
        {paying.length === 0 && <div className="text-xs py-3" style={{ color: 'var(--ink-3)' }}>Ainda sem pagantes</div>}
        {paying.map((w) => (
          <Row key={w.id}>
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{w.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{w.ownerEmail}</div>
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Desde {format(new Date(w.createdAt), 'dd/MM/yyyy')}
            </div>
          </Row>
        ))}
      </Section>

      <Section title="Churn (cancelados/expirados)" icon={AlertTriangle} iconColor="#94a3b8">
        {churned.length === 0 && <div className="text-xs py-3" style={{ color: 'var(--ink-3)' }}>Sem churn</div>}
        {churned.map((w) => (
          <Row key={w.id}>
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{w.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{w.ownerEmail}</div>
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{w.subscriptionStatus}</div>
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children }: { title: string; icon: any; iconColor: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h2 className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{title}</h2>
      </div>
      <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        {children}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: '1px solid var(--edge)' }}
    >
      {children}
    </div>
  );
}
