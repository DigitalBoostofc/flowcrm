import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { AlertTriangle, DollarSign, Search } from 'lucide-react';
import { listWorkspaces, updateWorkspace, type WorkspaceSummary } from '@/api/platform';
import { adminListPlans, type Plan } from '@/api/workspace';
import { useToastStore } from '@/store/toast.store';

type Status = 'trial' | 'active' | 'expired' | 'canceled';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Ativa' },
  { value: 'expired', label: 'Expirada' },
  { value: 'canceled', label: 'Cancelada' },
];

export default function SubscriptionsTab() {
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [search, setSearch] = useState('');

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['platform-workspaces', ''],
    queryFn: () => listWorkspaces(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: adminListPlans,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ subscriptionStatus: string; planSlug: string | null }> }) =>
      updateWorkspace(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-workspaces'] });
    },
    onError: (err: any) => {
      pushToast({ title: 'Erro ao atualizar assinatura', body: err?.response?.data?.message ?? err?.message ?? 'Falha desconhecida' });
    },
  });

  const now = new Date();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.ownerEmail?.toLowerCase().includes(q) ||
        w.ownerName?.toLowerCase().includes(q),
    );
  }, [workspaces, search]);

  const trialExpiring = filtered
    .filter((w) => w.subscriptionStatus === 'trial')
    .map((w) => ({ ...w, daysLeft: differenceInDays(new Date(w.trialEndsAt), now) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const paying = filtered.filter((w) => w.subscriptionStatus === 'active');
  const churned = filtered.filter((w) => w.subscriptionStatus === 'canceled' || w.subscriptionStatus === 'expired');

  const renderRow = (w: WorkspaceSummary & { daysLeft?: number }) => (
    <Row key={w.id}>
      <div className="flex-1 min-w-0">
        <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{w.name}</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{w.ownerEmail}</div>
      </div>

      <StatusSelect
        value={w.subscriptionStatus}
        onChange={(status) => updateMut.mutate({ id: w.id, patch: { subscriptionStatus: status } })}
        disabled={updateMut.isPending}
      />

      <PlanSelect
        plans={plans}
        value={w.planSlug}
        onChange={(slug) => updateMut.mutate({ id: w.id, patch: { planSlug: slug } })}
        disabled={updateMut.isPending}
      />

      {typeof w.daysLeft === 'number' ? (
        <div
          className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: w.daysLeft < 0 ? '#fee2e2' : w.daysLeft < 3 ? '#fef3c7' : '#f1f5f9',
            color: w.daysLeft < 0 ? '#991b1b' : w.daysLeft < 3 ? '#a16207' : '#475569',
          }}
        >
          {w.daysLeft < 0 ? `expirou há ${-w.daysLeft}d` : w.daysLeft === 0 ? 'expira hoje' : `${w.daysLeft}d restantes`}
        </div>
      ) : (
        <div className="text-xs flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
          {format(new Date(w.createdAt), 'dd/MM/yyyy')}
        </div>
      )}
    </Row>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-3)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar workspace, proprietário ou e-mail"
          className="w-full h-9 pl-9 pr-3 rounded-lg text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        />
      </div>

      <Section title="Trials" icon={AlertTriangle} iconColor="#f59e0b">
        {isLoading && <Empty>Carregando…</Empty>}
        {!isLoading && trialExpiring.length === 0 && <Empty>Nenhum trial ativo</Empty>}
        {trialExpiring.map((w) => renderRow(w))}
      </Section>

      <Section title="Pagantes" icon={DollarSign} iconColor="#22c55e">
        {paying.length === 0 && <Empty>Ainda sem pagantes</Empty>}
        {paying.map((w) => renderRow(w))}
      </Section>

      <Section title="Churn (cancelados/expirados)" icon={AlertTriangle} iconColor="#94a3b8">
        {churned.length === 0 && <Empty>Sem churn</Empty>}
        {churned.map((w) => renderRow(w))}
      </Section>
    </div>
  );
}

function StatusSelect({ value, onChange, disabled }: { value: Status; onChange: (s: Status) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Status)}
      className="h-7 px-2 text-xs rounded-md flex-shrink-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-2)', minWidth: 100 }}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function PlanSelect({
  plans, value, onChange, disabled,
}: {
  plans: Plan[];
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      className="h-7 px-2 text-xs rounded-md flex-shrink-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-2)', minWidth: 140 }}
    >
      <option value="">— sem plano —</option>
      {plans.map((p) => (
        <option key={p.id} value={p.slug} disabled={!p.active}>
          {p.name}{!p.active ? ' (inativo)' : ''}
        </option>
      ))}
    </select>
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs py-3 px-4" style={{ color: 'var(--ink-3)' }}>{children}</div>;
}
