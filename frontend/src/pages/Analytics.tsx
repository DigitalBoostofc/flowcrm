import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Trophy, XCircle, CircleDot, DollarSign, Clock } from 'lucide-react';
import { getAnalyticsSummary } from '@/api/analytics';
import { listPipelines } from '@/api/pipelines';
import { formatBRL } from '@/lib/format';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function MetricCard({ icon, label, value, sub, valueStyle }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; valueStyle?: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color: 'var(--ink-3)' }}>{icon}</div>
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueStyle ?? ''}`} style={!valueStyle ? { color: 'var(--ink-1)' } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', pipelineId],
    queryFn: () => getAnalyticsSummary(pipelineId ?? undefined),
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
        { name: 'Ativo', value: data.totals.active, color: '#3b82f6' },
        { name: 'Ganho', value: data.totals.won, color: '#10b981' },
        { name: 'Perdido', value: data.totals.lost, color: '#ef4444' },
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
          <option value="">Todos os pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <div className="text-sm" style={{ color: 'var(--ink-2)' }}>Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard icon={<CircleDot className="w-4 h-4" />} label="Em andamento" value={data.totals.active} />
            <MetricCard icon={<Trophy className="w-4 h-4" />} label="Ganhos" value={data.totals.won} valueStyle="text-emerald-500" />
            <MetricCard icon={<XCircle className="w-4 h-4" />} label="Perdidos" value={data.totals.lost} valueStyle="text-red-500" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Conversão" value={`${data.conversionRate}%`} valueStyle="text-brand-500" />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Valor ganho" value={formatBRL(data.values.won)} valueStyle="text-emerald-500" />
            <MetricCard icon={<Clock className="w-4 h-4" />} label="Dias médios" value={data.avgDaysToWin} sub="para fechar" />
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
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--ink-1)' }}>Por agente</h3>
              {data.byAgent.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.byAgent.map((a) => (
                    <div
                      key={a.agentId}
                      className="flex items-center justify-between py-2 last:border-0"
                      style={{ borderBottom: '1px solid var(--edge)' }}
                    >
                      <div>
                        <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{a.name}</div>
                        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                          {a.active} ativos ·{' '}
                          <span className="text-emerald-500">{a.won} ganhos</span> ·{' '}
                          <span className="text-red-500">{a.lost} perdidos</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>
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
        </>
      )}
    </div>
  );
}
