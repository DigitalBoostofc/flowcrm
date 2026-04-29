import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Undo2, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { getTrash, restoreFromTrash, purgeFromTrash, TRASH_TYPES, type TrashType, type TrashItem } from '@/api/trash';

const TYPE_LABELS: Record<TrashType, string> = {
  leads: 'Negócios',
  contacts: 'Contatos',
  companies: 'Empresas',
  products: 'Produtos',
};

export default function LixeiraTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['trash'], queryFn: getTrash });
  const [activeType, setActiveType] = useState<TrashType>('leads');
  const [confirmPurge, setConfirmPurge] = useState<TrashItem | null>(null);

  const restoreMut = useMutation({
    mutationFn: ({ type, id }: { type: TrashType; id: string }) => restoreFromTrash(type, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trash'] }),
  });

  const purgeMut = useMutation({
    mutationFn: ({ type, id }: { type: TrashType; id: string }) => purgeFromTrash(type, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] });
      setConfirmPurge(null);
    },
  });

  const retentionDays = data?.retentionDays ?? 30;
  const items = data?.items[activeType] ?? [];
  const counts: Record<TrashType, number> = TRASH_TYPES.reduce(
    (acc, t) => ({ ...acc, [t]: data?.items[t]?.length ?? 0 }),
    {} as Record<TrashType, number>,
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
          Lixeira
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Itens excluídos ficam aqui por <strong>{retentionDays} dias</strong> antes de serem apagados definitivamente.
          Você pode restaurar a qualquer momento durante esse período.
        </p>
      </header>

      {/* Tabs por tipo */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--edge)' }}>
        {TRASH_TYPES.map((type) => {
          const active = type === activeType;
          const count = counts[type];
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className="relative px-3 py-2 text-sm transition-colors"
              style={{
                color: active ? 'var(--brand-500)' : 'var(--ink-3)',
                fontWeight: active ? 600 : 400,
                borderBottom: active ? '2px solid var(--brand-500)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {TYPE_LABELS[type]}
              {count > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center justify-center text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                  style={{
                    background: active ? 'var(--brand-50)' : 'var(--surface-hover)',
                    color: active ? 'var(--brand-500)' : 'var(--ink-3)',
                    minWidth: 18,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'var(--ink-3)' }}>
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando lixeira…
        </div>
      )}

      {isError && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
          Erro ao carregar a lixeira.
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl"
          style={{ background: 'var(--surface-hover)', border: '1px dashed var(--edge)' }}
        >
          <Inbox className="w-8 h-8 mb-3" strokeWidth={1.5} style={{ color: 'var(--ink-3)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Nada na lixeira de {TYPE_LABELS[activeType].toLowerCase()}.
          </p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--edge)' }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{
                background: 'var(--surface)',
                borderTop: idx === 0 ? 'none' : '1px solid var(--edge)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>
                  {item.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  Excluído em {formatDate(item.deletedAt)} · purge em{' '}
                  <strong style={{ color: item.daysUntilPurge <= 3 ? 'var(--danger)' : 'var(--ink-2)' }}>
                    {item.daysUntilPurge} {item.daysUntilPurge === 1 ? 'dia' : 'dias'}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => restoreMut.mutate({ type: activeType, id: item.id })}
                disabled={restoreMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--edge)',
                  color: 'var(--ink-2)',
                }}
              >
                <Undo2 className="w-3.5 h-3.5" strokeWidth={2} /> Restaurar
              </button>
              <button
                onClick={() => setConfirmPurge(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(229,72,77,0.25)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} /> Excluir definitivamente
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de purge */}
      {confirmPurge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !purgeMut.isPending && setConfirmPurge(null)}
        >
          <div
            className="w-full max-w-md"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(229,72,77,0.1)' }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)' }}>
                  Excluir definitivamente?
                </h3>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                <strong>{confirmPurge.label}</strong> será apagado permanentemente. Não há como recuperar.
              </p>
              {purgeMut.isError && (
                <p
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                >
                  Erro ao excluir. Tente novamente.
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmPurge(null)}
                  disabled={purgeMut.isPending}
                  className="flex-1 h-9 rounded-lg text-sm font-medium"
                  style={{
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--edge)',
                    color: 'var(--ink-2)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => purgeMut.mutate({ type: activeType, id: confirmPurge.id })}
                  disabled={purgeMut.isPending}
                  className="flex-1 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'var(--danger)' }}
                >
                  {purgeMut.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Excluindo…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" strokeWidth={2} /> Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
