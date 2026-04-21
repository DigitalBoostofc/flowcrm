import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Radio, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { listPlatformChannels } from '@/api/platform';

type StatusKey = 'connected' | 'disconnected' | 'error';

const STATUS_META: Record<StatusKey, { label: string; fg: string; bg: string; dot: string }> = {
  connected:    { label: 'Conectado',    fg: '#166534', bg: '#dcfce7', dot: '#16a34a' },
  disconnected: { label: 'Desconectado', fg: '#854d0e', bg: '#fef3c7', dot: '#eab308' },
  error:        { label: 'Erro',          fg: '#991b1b', bg: '#fee2e2', dot: '#dc2626' },
};

const FILTERS: Array<{ key: StatusKey; Icon: typeof CheckCircle2 }> = [
  { key: 'connected',    Icon: CheckCircle2 },
  { key: 'disconnected', Icon: AlertTriangle },
  { key: 'error',        Icon: XCircle },
];

function normStatus(s: string): StatusKey {
  return s === 'connected' || s === 'error' ? s : 'disconnected';
}

export default function ChannelsTab() {
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['platform-channels'],
    queryFn: listPlatformChannels,
    refetchInterval: 15_000,
  });

  const [selected, setSelected] = useState<Set<StatusKey>>(new Set());

  const toggle = (key: StatusKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const counts = useMemo(() => {
    const c = { connected: 0, disconnected: 0, error: 0 } as Record<StatusKey, number>;
    for (const ch of channels) c[normStatus(ch.status)]++;
    return c;
  }, [channels]);

  const visible = useMemo(() => {
    if (selected.size === 0) return channels;
    return channels.filter((c) => selected.has(normStatus(c.status)));
  }, [channels, selected]);

  return (
    <div className="max-w-6xl">
      {/* Filtros */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {FILTERS.map(({ key, Icon }) => {
          const meta = STATUS_META[key];
          const active = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: active ? meta.bg : 'var(--surface)',
                color: active ? meta.fg : 'var(--ink-2)',
                border: `1px solid ${active ? meta.dot : 'var(--edge)'}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: meta.dot }}
              />
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
              <span
                className="ml-1 px-1.5 rounded-full text-[10px] tabular-nums"
                style={{ background: active ? 'rgba(0,0,0,0.08)' : 'var(--surface-hover)', color: 'inherit' }}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 text-xs"
            style={{ color: 'var(--ink-3)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--edge)' }}>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Canal</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Workspace</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Tipo</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Status</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Criado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Carregando...</td></tr>
            )}
            {!isLoading && visible.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                {channels.length === 0 ? 'Nenhum canal configurado' : 'Nenhum canal corresponde aos filtros selecionados'}
              </td></tr>
            )}
            {visible.map((c) => {
              const meta = STATUS_META[normStatus(c.status)];
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--edge)' }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2" style={{ color: 'var(--ink-1)' }}>
                      <Radio className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--ink-2)' }}>{c.workspaceName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-2)' }}>{c.type}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                    {format(new Date(c.createdAt), 'dd/MM/yyyy')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
