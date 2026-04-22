import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, LogIn, Calendar } from 'lucide-react';
import { listWorkspaces, impersonateWorkspace, updateWorkspace } from '@/api/platform';
import type { WorkspaceSummary } from '@/api/platform';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

const STATUS_META: Record<string, { label: string; fg: string; bg: string }> = {
  trial: { label: 'Trial', fg: '#a16207', bg: '#fef3c7' },
  active: { label: 'Ativo', fg: '#166534', bg: '#dcfce7' },
  expired: { label: 'Expirado', fg: '#991b1b', bg: '#fee2e2' },
  canceled: { label: 'Cancelado', fg: '#475569', bg: '#f1f5f9' },
};

export default function WorkspacesTab() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<WorkspaceSummary | null>(null);
  const qc = useQueryClient();
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['platform-workspaces', search],
    queryFn: () => listWorkspaces(search || undefined),
  });

  const setAuth = useAuthStore((s) => s.setAuth);
  const nav = useNavigate();
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const impersonate = async (id: string) => {
    if (!confirm('Entrar neste workspace? Todas ações serão registradas no audit log.')) return;
    setImpersonatingId(id);
    try {
      const res = await impersonateWorkspace(id);
      qc.clear();
      setAuth(res.accessToken, res.user);
      nav('/');
    } finally {
      setImpersonatingId(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--edge)' }}>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Workspace</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Proprietário</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Status</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Trial até</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Usuários</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Leads</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Msgs 30d</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Carregando...</td></tr>
            )}
            {!isLoading && workspaces.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Nenhum workspace</td></tr>
            )}
            {workspaces.map((w) => {
              const meta = STATUS_META[w.subscriptionStatus] ?? STATUS_META.trial;
              const isBusy = impersonatingId === w.id;
              return (
                <tr key={w.id} style={{ borderBottom: '1px solid var(--edge)' }}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--ink-1)' }}>{w.name}</td>
                  <td className="px-4 py-2.5">
                    <div style={{ color: 'var(--ink-1)' }}>{w.ownerName ?? '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{w.ownerEmail ?? ''}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--ink-2)' }}>
                    {format(new Date(w.trialEndsAt), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: 'var(--ink-1)' }}>{w.usersCount}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: 'var(--ink-1)' }}>{w.leadsCount}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: 'var(--ink-1)' }}>{w.messagesLast30d}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(w)}
                        className="p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
                        style={{ color: 'var(--ink-3)' }}
                        title="Editar"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => impersonate(w.id)}
                        disabled={isBusy}
                        className="p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                        style={{ color: 'var(--brand-500)' }}
                        title="Entrar como"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditWorkspaceModal
          ws={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['platform-workspaces'] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditWorkspaceModal({ ws, onClose, onSaved }: { ws: WorkspaceSummary; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(ws.name);
  const [status, setStatus] = useState(ws.subscriptionStatus);
  const [trialEndsAt, setTrialEndsAt] = useState(ws.trialEndsAt.slice(0, 10));

  const mut = useMutation({
    mutationFn: () =>
      updateWorkspace(ws.id, {
        name,
        subscriptionStatus: status,
        trialEndsAt: new Date(trialEndsAt).toISOString(),
      }),
    onSuccess: onSaved,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>Editar workspace</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            >
              <option value="trial">Trial</option>
              <option value="active">Ativo</option>
              <option value="expired">Expirado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Trial termina em</label>
            <input
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: 'var(--ink-2)' }}>
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-1.5 text-sm rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500)' }}
          >
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
