import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Globe, Building2 } from 'lucide-react';
import { listFlags, upsertFlag, deleteFlag, listWorkspaces } from '@/api/platform';

export default function FeatureFlagsTab() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: flags = [] } = useQuery({ queryKey: ['platform-flags'], queryFn: listFlags });
  const { data: workspaces = [] } = useQuery({ queryKey: ['platform-workspaces', ''], queryFn: () => listWorkspaces() });

  const wsName = (id: string | null) => {
    if (!id) return 'Global';
    return workspaces.find((w) => w.id === id)?.name ?? id.slice(0, 8);
  };

  const toggleMut = useMutation({
    mutationFn: (f: { key: string; workspaceId: string | null; enabled: boolean }) =>
      upsertFlag({ key: f.key, workspaceId: f.workspaceId, enabled: f.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-flags'] }),
  });

  const delMut = useMutation({
    mutationFn: deleteFlag,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-flags'] }),
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Ative recursos globalmente ou por workspace
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Nova flag
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--edge)' }}>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Chave</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Escopo</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Nenhuma flag</td></tr>
            )}
            {flags.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--edge)' }}>
                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--ink-1)' }}>{f.key}</td>
                <td className="px-4 py-2.5">
                  {f.workspaceId ? (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                      <Building2 className="w-3 h-3" /> {wsName(f.workspaceId)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--brand-500)' }}>
                      <Globe className="w-3 h-3" /> Global
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      onChange={(e) => toggleMut.mutate({ key: f.key, workspaceId: f.workspaceId, enabled: e.target.checked })}
                    />
                  </label>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => { if (confirm('Excluir flag?')) delMut.mutate(f.id); }}
                    className="p-1.5 rounded hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewFlagModal
          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['platform-flags'] });
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function NewFlagModal({ workspaces, onClose, onSaved }: { workspaces: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [enabled, setEnabled] = useState(true);

  const mut = useMutation({
    mutationFn: () => upsertFlag({ key, workspaceId: workspaceId || null, enabled }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl p-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>Nova feature flag</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Chave</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.replace(/\s+/g, '_').toLowerCase())}
              placeholder="ex: new_analytics"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Workspace (vazio = global)</label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            >
              <option value="">Global (todos os workspaces)</option>
              {workspaces.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-1)' }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Ativo
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: 'var(--ink-2)' }}>
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!key || mut.isPending}
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
