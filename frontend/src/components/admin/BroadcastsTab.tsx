import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import {
  listBroadcasts, createBroadcast, updateBroadcast, deleteBroadcast,
} from '@/api/platform';
import type { Broadcast, BroadcastSeverity } from '@/api/platform';

const SEVERITY_META: Record<BroadcastSeverity, { label: string; fg: string; bg: string }> = {
  info: { label: 'Info', fg: '#1e40af', bg: '#dbeafe' },
  warning: { label: 'Aviso', fg: '#a16207', bg: '#fef3c7' },
  critical: { label: 'Crítico', fg: '#991b1b', bg: '#fee2e2' },
};

export default function BroadcastsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Broadcast | 'new' | null>(null);
  const { data: broadcasts = [] } = useQuery({ queryKey: ['platform-broadcasts'], queryFn: listBroadcasts });

  const delMut = useMutation({
    mutationFn: deleteBroadcast,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-broadcasts'] }),
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Avisos exibidos no topo da app para todos os workspaces
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Novo broadcast
        </button>
      </div>

      <div className="space-y-2">
        {broadcasts.length === 0 && (
          <div
            className="rounded-xl px-4 py-8 text-center text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
          >
            Nenhum broadcast criado
          </div>
        )}
        {broadcasts.map((b) => {
          const meta = SEVERITY_META[b.severity];
          return (
            <div
              key={b.id}
              className="rounded-xl p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              <div className="flex items-start gap-3">
                <Megaphone className="w-4 h-4 mt-0.5" style={{ color: 'var(--ink-3)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{b.title}</div>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      {meta.label}
                    </span>
                    {!b.active && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#475569' }}>
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--ink-2)' }}>{b.body}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    Por {b.createdByEmail} em {format(new Date(b.createdAt), 'dd/MM/yyyy HH:mm')}
                    {b.endsAt && ` · Termina em ${format(new Date(b.endsAt), 'dd/MM/yyyy')}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(b)}
                    className="p-1.5 rounded hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Excluir broadcast?')) delMut.mutate(b.id); }}
                    className="p-1.5 rounded hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <BroadcastModal
          broadcast={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['platform-broadcasts'] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function BroadcastModal({ broadcast, onClose, onSaved }: { broadcast: Broadcast | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(broadcast?.title ?? '');
  const [body, setBody] = useState(broadcast?.body ?? '');
  const [severity, setSeverity] = useState<BroadcastSeverity>(broadcast?.severity ?? 'info');
  const [active, setActive] = useState(broadcast?.active ?? true);
  const [endsAt, setEndsAt] = useState(broadcast?.endsAt ? broadcast.endsAt.slice(0, 10) : '');

  const mut = useMutation({
    mutationFn: () => {
      const payload: any = { title, body, severity, active };
      if (endsAt) payload.endsAt = new Date(endsAt + 'T23:59:59').toISOString();
      return broadcast ? updateBroadcast(broadcast.id, payload) : createBroadcast(payload);
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl p-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>
          {broadcast ? 'Editar broadcast' : 'Novo broadcast'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Severidade</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BroadcastSeverity)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              >
                <option value="info">Info</option>
                <option value="warning">Aviso</option>
                <option value="critical">Crítico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Termina em (opcional)</label>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-1)' }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: 'var(--ink-2)' }}>
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!title || !body || mut.isPending}
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
