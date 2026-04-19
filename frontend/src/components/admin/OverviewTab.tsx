import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, MessageCircle, Clock, UserPlus, CheckCircle2, Building2, DollarSign } from 'lucide-react';
import { getPlatformMetrics, getSignupFunnel } from '@/api/platform';

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{label}</div>
      </div>
      <div className="text-2xl font-semibold" style={{ color: 'var(--ink-1)' }}>{value}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  );
}

export default function OverviewTab() {
  const { data: metrics } = useQuery({ queryKey: ['platform-metrics'], queryFn: getPlatformMetrics });
  const { data: funnel } = useQuery({ queryKey: ['platform-funnel', 30], queryFn: () => getSignupFunnel(30) });

  if (!metrics) {
    return <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Carregando...</div>;
  }

  const conversionRate = funnel && funnel.started > 0
    ? `${Math.round((funnel.convertedToPaid / funnel.started) * 100)}%`
    : '—';

  return (
    <div className="space-y-6 max-w-6xl">
      <section>
        <h2 className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--ink-3)' }}>Visão global</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Building2} label="Workspaces" value={metrics.totalWorkspaces} />
          <MetricCard icon={Users} label="Usuários" value={metrics.totalUsers} />
          <MetricCard icon={Briefcase} label="Leads" value={metrics.totalLeads} />
          <MetricCard icon={MessageCircle} label="Msgs últimos 30d" value={metrics.totalMessagesLast30d} />
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--ink-3)' }}>Status de assinatura</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Clock} label="Em trial" value={metrics.byStatus.trial} sub={`${metrics.trialExpiringIn7d} expiram em 7 dias`} />
          <MetricCard icon={DollarSign} label="Ativos (pagantes)" value={metrics.byStatus.active} />
          <MetricCard icon={Clock} label="Expirados" value={metrics.byStatus.expired} />
          <MetricCard icon={Clock} label="Cancelados" value={metrics.byStatus.canceled} />
        </div>
      </section>

      {funnel && (
        <section>
          <h2 className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--ink-3)' }}>Funil de cadastro (últimos 30 dias)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={UserPlus} label="Iniciaram" value={funnel.started} />
            <MetricCard icon={CheckCircle2} label="Verificaram OTP" value={funnel.verified} />
            <MetricCard icon={Building2} label="Workspaces criados" value={funnel.workspacesCreated} />
            <MetricCard icon={DollarSign} label="Viraram pagantes" value={funnel.convertedToPaid} sub={`Conversão: ${conversionRate}`} />
          </div>
        </section>
      )}
    </div>
  );
}
