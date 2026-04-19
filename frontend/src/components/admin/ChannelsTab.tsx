import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Radio } from 'lucide-react';
import { listPlatformChannels } from '@/api/platform';

const STATUS_META: Record<string, { label: string; fg: string; bg: string }> = {
  connected: { label: 'Conectado', fg: '#166534', bg: '#dcfce7' },
  disconnected: { label: 'Desconectado', fg: '#991b1b', bg: '#fee2e2' },
  error: { label: 'Erro', fg: '#991b1b', bg: '#fee2e2' },
};

export default function ChannelsTab() {
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['platform-channels'],
    queryFn: listPlatformChannels,
    refetchInterval: 15_000,
  });

  return (
    <div className="max-w-6xl">
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--edge)' }}>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Canal</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Workspace</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Tipo</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Status</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Ativo</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Criado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Carregando...</td></tr>
            )}
            {!isLoading && channels.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Nenhum canal configurado</td></tr>
            )}
            {channels.map((c) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.disconnected;
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
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-2)' }}>{c.active ? 'Sim' : 'Não'}</td>
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
