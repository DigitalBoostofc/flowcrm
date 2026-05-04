import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Trophy, XCircle, CircleDot, DollarSign, Clock, AlertTriangle, BadgeDollarSign, Snowflake } from 'lucide-react';
import { getAnalyticsSummary } from '@/api/analytics';
import { listPipelines } from '@/api/pipelines';
import { formatBRL } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function MetricCard({ icon, label, value, sub, valueStyle }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; valueStyle?: string;
}) {
  return (
    <div
      className="glass rounded-xl p-4 group transition-all duration-200"
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <div style={{ color: 'var(--ink-3)' }}>{icon}</div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <div className={`text-2xl font-bold leading-none ${valueStyle ?? ''}`} style={!valueStyle ? { color: 'var(--ink-1)' } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs mt-1 font-medium" style={{ color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', pipelineId],
    queryFn: () => getAnalyticsSummary(pipelineId ?? undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const leadsByDayData = data
    ? Object.entries(data.leadsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, count]) => ({
          date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          leads: count,
        }))
    : [];

  const pieData = data
    ? [
        { name: 'Ativo',      value: data.totals.active, color: '#3b82f6' },
        { name: 'Ganho',      value: data.totals.won,    color: '#10b981' },
        { name: 'Perdido',    value: data.totals.lost,   color: '#ef4444' },
        { name: 'Congelado',  value: data.totals.frozen, color: '#0ea5e9' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Analytics</h1>
        <select
          className="select-base"
          value={pipelineId ?? ''}
          onChange={(e) => setPipelineId(e.target.value || null)}
        >
          <option value="">Todos os funis de vendas</option>
          {pipelines.filter((p) => p.kind === 'sale').map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            Não foi possível carregar os dados de analytics.
          </p>
          <button
            onClick={() => refetch()}
            className="btn-primary text-sm px-4 py-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading || !data ? (
        <div className="space-y-6 animate-fade-up">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass lg:col-span-2 rounded-xl p-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
            <div className="glass rounded-xl p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[150px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard icon={<Trophy className="w-4 h-4" />} label="Ganhos" value={data.totals.won} valueStyle="text-emerald-500" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Taxa de conversão" value={`${data.conversionRate}%`} valueStyle="text-brand-500" />
            <MetricCard icon={<Clock className="w-4 h-4" />} label="Ciclo médio" value={`${data.avgDaysToWin}d`} sub="para fechar negócio" />
            <MetricCard icon={<BadgeDollarSign className="w-4 h-4" />} label="Ticket médio" value={formatBRL(data.avgTicket)} valueStyle="text-emerald-500" sub={`sobre ${data.totals.won} ganhos`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            <MetricCard icon={<CircleDot className="w-4 h-4" />} label="Em andamento" value={data.totals.active} />
            <MetricCard icon={<Snowflake className="w-4 h-4" />} label="Congelados" value={data.totals.frozen} valueStyle="text-sky-500" />
            <MetricCard icon={<XCircle className="w-4 h-4" />} label="Perdidos" value={data.totals.lost} valueStyle="text-red-500" />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Receita total (ganhos)" value={formatBRL(data.values.won)} valueStyle="text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass lg:col-span-2 rounded-xl p-4">
              <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--ink-1)' }}>
                Leads criados (últimos 14 dias)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsByDayData}>
                  <XAxis dataKey="date" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-overlay)',
                      border: '1px solid var(--edge-strong)',
                      borderRadius: 8,
                      color: 'var(--ink-1)',
                    }}
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                  />
                  <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--ink-1)' }}>
                Distribuição de status
              </h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface-overlay)',
                          border: '1px solid var(--edge-strong)',
                          borderRadius: 8,
                          color: 'var(--ink-1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 mt-2">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span style={{ color: 'var(--ink-2)' }}>{d.name}</span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--ink-1)' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-center py-8" style={{ color: 'var(--ink-3)' }}>Sem dados</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink-1)' }}>Ranking de vendedores</h3>
              {data.byAgent.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.byAgent
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((a, i) => (
                      <div
                        key={a.agentId}
                        className="flex items-center gap-3 py-2 last:border-0"
                        style={{ borderBottom: '1px solid var(--edge)' }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] + '33', color: COLORS[i % COLORS.length] }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate" style={{ color: 'var(--ink-1)' }}>{a.name}</div>
                          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                            {a.active} ativos ·{' '}
                            <span className="text-emerald-500">{a.won} ganhos</span> ·{' '}
                            <span className="text-red-500">{a.lost} perdidos</span>
                            {a.frozen > 0 && <> · <span className="text-sky-500">{a.frozen} cong.</span></>}
                          </div>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
                          {formatBRL(a.value)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink-1)' }}>
                Principais motivos de perda
              </h3>
              {data.topLossReasons.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {data.topLossReasons.map((r, i) => (
                    <div key={r.reason} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: COLORS[i] + '33', color: COLORS[i] }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate" style={{ color: 'var(--ink-1)' }}>{r.reason}</div>
                        <div className="mt-1 rounded-full h-1.5" style={{ background: 'var(--edge-strong)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(r.count / data.topLossReasons[0].count) * 100}%`,
                              background: COLORS[i],
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{r.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Receita por origem + Clientes negligenciados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--ink-1)' }}>
                Receita por origem (negócios ganhos)
              </h3>
              {data.revenueByOrigin.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Sem dados de origem</p>
              ) : (
                <div className="flex gap-4 items-center">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={data.revenueByOrigin} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={2}>
                        {data.revenueByOrigin.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => formatBRL(Number(v ?? 0))}
                        contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--edge-strong)', borderRadius: 8, color: 'var(--ink-1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {data.revenueByOrigin.map((d, i) => (
                      <div key={d.origin} className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="truncate" style={{ color: 'var(--ink-2)' }}>{d.origin}</span>
                        </div>
                        <span className="font-medium flex-shrink-0" style={{ color: 'var(--ink-1)' }}>{formatBRL(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--ink-1)' }}>
                Clientes negligenciados
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>Negócios ativos sem atualização há mais de 14 dias</p>
              {data.neglectedLeads.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-3)' }}>Nenhum negócio negligenciado</p>
              ) : (
                <div className="space-y-2">
                  {data.neglectedLeads.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 py-2 last:border-0"
                      style={{ borderBottom: '1px solid var(--edge)' }}
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate" style={{ color: 'var(--ink-1)' }}>
                          {l.title ?? l.contactName ?? 'Sem título'}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{l.assignedTo}</div>
                      </div>
                      <span
                        className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full"
                        style={{ background: '#fef3c7', color: '#92400e' }}
                      >
                        {l.daysSinceUpdate}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
