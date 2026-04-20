import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from './types';

interface Props<T> {
  rows: T[];
  rowKey: (row: T, index: number) => string;
  columns: ColumnDef<T>[];
  widths: Record<string, number>;
  onWidthChange: (key: string, width: number) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingState?: React.ReactNode;
  trailing?: (row: T, index: number) => React.ReactNode;
  trailingWidth?: number;
}

export default function ResizableDataList<T>({
  rows,
  rowKey,
  columns,
  widths,
  onWidthChange,
  onRowClick,
  emptyState,
  loading = false,
  loadingState,
  trailing,
  trailingWidth = 36,
}: Props<T>) {
  const gridTemplate = useMemo(() => {
    const cols = columns.map((c) => `${widths[c.key] ?? c.defaultWidth}px`).join(' ');
    return trailing ? `${cols} ${trailingWidth}px` : cols;
  }, [columns, widths, trailing, trailingWidth]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 'min-content' }}>
          <div
            className="grid px-6 py-3 text-xs font-bold uppercase tracking-wide"
            style={{
              gridTemplateColumns: gridTemplate,
              borderBottom: '1px solid var(--edge)',
              color: 'var(--ink-2)',
            }}
          >
            {columns.map((col, idx) => (
              <HeaderCell
                key={col.key}
                label={col.label}
                align={col.align}
                isLast={!trailing && idx === columns.length - 1}
                onResize={(delta) => {
                  const current = widths[col.key] ?? col.defaultWidth;
                  onWidthChange(col.key, current + delta);
                }}
                className={col.headerClassName}
              />
            ))}
            {trailing && <div />}
          </div>

          {loading ? (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>
              {loadingState ?? 'Carregando...'}
            </div>
          ) : rows.length === 0 ? (
            emptyState ?? (
              <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>
                Sem resultados.
              </div>
            )
          ) : (
            <div>
              {rows.map((row, idx) => (
                <div
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                  className={`group grid px-6 py-3 text-sm transition-colors items-center ${onRowClick ? 'hover:bg-[var(--surface-hover)] cursor-pointer' : ''}`}
                  style={{
                    gridTemplateColumns: gridTemplate,
                    borderBottom: '1px solid var(--edge)',
                    color: 'var(--ink-1)',
                  }}
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className={`min-w-0 ${col.cellClassName ?? ''}`}
                      style={{
                        textAlign: col.align,
                        paddingRight: 12,
                      }}
                    >
                      {col.render(row, idx)}
                    </div>
                  ))}
                  {trailing && <div onClick={(e) => e.stopPropagation()}>{trailing(row, idx)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderCell({
  label,
  align,
  isLast,
  onResize,
  className,
}: {
  label: string;
  align?: 'left' | 'right' | 'center';
  isLast: boolean;
  onResize: (delta: number) => void;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current - accumulated.current;
      if (delta !== 0) {
        accumulated.current += delta;
        onResize(delta);
      }
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, onResize]);

  return (
    <div
      className={`relative min-w-0 select-none ${className ?? ''}`}
      style={{ textAlign: align, paddingRight: 12 }}
    >
      <span className="truncate inline-block align-middle" style={{ maxWidth: '100%' }}>{label}</span>
      {!isLast && (
        <span
          onMouseDown={(e) => {
            e.preventDefault();
            startX.current = e.clientX;
            accumulated.current = 0;
            setDragging(true);
          }}
          title="Arraste para redimensionar"
          style={{
            position: 'absolute',
            top: -4,
            right: 0,
            bottom: -4,
            width: 8,
            cursor: 'col-resize',
            zIndex: 2,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 4,
              bottom: 4,
              right: 3,
              width: 2,
              background: dragging ? 'var(--brand-500, #6366f1)' : 'transparent',
              transition: 'background 120ms',
            }}
          />
        </span>
      )}
    </div>
  );
}
