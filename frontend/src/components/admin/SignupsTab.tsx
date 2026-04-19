import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, Clock } from 'lucide-react';
import { listSignups } from '@/api/platform';

export default function SignupsTab() {
  const [days, setDays] = useState(30);
  const { data: signups = [], isLoading } = useQuery({
    queryKey: ['platform-signups', days],
    queryFn: () => listSignups(days),
  });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 text-xs rounded-lg outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{signups.length} cadastros</div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--edge)' }}>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Nome</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Email</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>WhatsApp</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Workspace</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Status</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Iniciado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Carregando...</td></tr>
            )}
            {!isLoading && signups.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Nenhum cadastro no período</td></tr>
            )}
            {signups.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--edge)' }}>
                <td className="px-4 py-2.5" style={{ color: 'var(--ink-1)' }}>{s.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-2)' }}>{s.email ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-2)' }}>{s.phone}</td>
                <td className="px-4 py-2.5" style={{ color: 'var(--ink-2)' }}>{s.workspaceName ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {s.verified ? (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#166534' }}>
                      <CheckCircle2 className="w-3 h-3" /> Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#a16207' }}>
                      <Clock className="w-3 h-3" /> Aguardando
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                  {format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
