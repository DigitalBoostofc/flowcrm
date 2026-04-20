import { useEffect, useState } from 'react';
import { X, GripVertical, RotateCcw } from 'lucide-react';
import type { ColumnDef } from './types';

interface Props<T> {
  open: boolean;
  onClose: () => void;
  title?: string;
  columns: ColumnDef<T>[];
  order: string[];
  hidden: string[];
  onApply: (next: { order: string[]; hidden: string[] }) => void;
  onReset: () => void;
}

export default function ViewEditorModal<T>({
  open,
  onClose,
  title = 'Editar visualização',
  columns,
  order,
  hidden,
  onApply,
  onReset,
}: Props<T>) {
  const [localOrder, setLocalOrder] = useState<string[]>(order);
  const [localHidden, setLocalHidden] = useState<Set<string>>(new Set(hidden));
  const [dragKey, setDragKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocalOrder(order);
      setLocalHidden(new Set(hidden));
    }
  }, [open, order, hidden]);

  if (!open) return null;

  const byKey = new Map(columns.map((c) => [c.key, c]));
  const orderedCols = localOrder
    .map((k) => byKey.get(k))
    .filter((c): c is ColumnDef<T> => !!c);

  const toggle = (key: string) => {
    const col = byKey.get(key);
    if (!col || col.required) return;
    setLocalHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    setLocalOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const visibleCount = orderedCols.filter((c) => !localHidden.has(c.key)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full animate-fade-up"
        style={{
          maxWidth: 520,
          maxHeight: '85vh',
          background: 'var(--surface-raised)',
          border: '1px solid var(--edge)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--edge)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {visibleCount} de {columns.length} colunas visíveis · arraste para reordenar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 8px' }}>
          {orderedCols.map((col, idx) => {
            const isHidden = localHidden.has(col.key);
            const isRequired = !!col.required;
            return (
              <div
                key={col.key}
                draggable={!isRequired}
                onDragStart={() => setDragKey(col.key)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!dragKey || dragKey === col.key) return;
                  const from = localOrder.indexOf(dragKey);
                  if (from < 0) return;
                  move(from, idx);
                }}
                onDragEnd={() => setDragKey(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: dragKey === col.key ? 'var(--surface-hover)' : 'transparent',
                  cursor: isRequired ? 'default' : 'grab',
                  opacity: isHidden ? 0.55 : 1,
                }}
              >
                <GripVertical
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isRequired ? 'transparent' : 'var(--ink-3)' }}
                />
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    disabled={isRequired}
                    onChange={() => toggle(col.key)}
                  />
                  <span className="text-sm truncate" style={{ color: 'var(--ink-1)' }}>{col.label}</span>
                  {isRequired && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-hover)', color: 'var(--ink-3)' }}
                    >
                      fixa
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-5 py-3"
          style={{ borderTop: '1px solid var(--edge)' }}
        >
          <button
            onClick={() => { onReset(); onClose(); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-2)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar padrão
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-medium px-3 py-2 rounded-lg"
              style={{ color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onApply({ order: localOrder, hidden: Array.from(localHidden) });
                onClose();
              }}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-white"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
