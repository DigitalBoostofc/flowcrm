import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ScrollText, ChevronDown, ChevronRight } from 'lucide-react';
import { listAudit, listWorkspaces } from '@/api/platform';

const ACTION_META: Record<string, { label: string; fg: string; bg: string }> = {
  'workspace.update': { label: 'Editou workspace', fg: '#1e40af', bg: '#dbeafe' },
  'workspace.impersonate': { label: 'Impersonou', fg: '#991b1b', bg: '#fee2e2' },
  'broadcast.create': { label: 'Criou broadcast', fg: '#166534', bg: '#dcfce7' },
  'broadcast.update': { label: 'Editou broadcast', fg: '#1e40af', bg: '#dbeafe' },
  'broadcast.delete': { label: 'Excluiu broadcast', fg: '#991b1b', bg: '#fee2e2' },
  'flag.create': { label: 'Criou flag', fg: '#166534', bg: '#dcfce7' },
  'flag.update': { label: 'Editou flag', fg: '#1e40af', bg: '#dbeafe' },
  'flag.delete': { label: 'Excluiu flag', fg: '#991b1b', bg: '#fee2e2' },
};

export default function AuditTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['platform-audit'],
    queryFn: () => listAudit(200),
  });
  const { data: workspaces = [] } = useQuery({ queryKey: ['platform-workspaces', ''], queryFn: () => listWorkspaces() });
  const wsName = (id: string | null) => id ? (workspaces.find((w) => w.id === id)?.name ?? id.slice(0, 8)) : null;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Últimas {logs.length} ações administrativas
        </div>
      </div>

      <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        {isLoading && <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Carregando...</div>}
        {!isLoading && logs.length === 0 && <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Nenhuma ação registrada</div>}
        {logs.map((log) => {
          const meta = ACTION_META[log.action] ?? { label: log.action, fg: '#475569', bg: '#f1f5f9' };
          const isOpen = expanded === log.id;
          const target = wsName(log.targetWorkspaceId);
          return (
            <div key={log.id} style={{ borderBottom: '1px solid var(--edge)' }}>
              <button
                onClick={() => setExpanded(isOpen ? null : log.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-hover)]"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />}
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: meta.bg, color: meta.fg }}>
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0 text-sm" style={{ color: 'var(--ink-1)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>{log.actorEmail}</span>
                  {target && <span style={{ color: 'var(--ink-3)' }}> → {target}</span>}
                </div>
                <div className="text-xs flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                  {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                </div>
              </button>
              {isOpen && (
                <pre
                  className="mx-4 mb-3 p-3 text-[11px] rounded-lg overflow-x-auto"
                  style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}
                >
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
