import { useEffect, useMemo, useRef, useState } from 'react';
import type { AggregateMode, ColumnDef } from './types';

const AGG_LABELS: Record<AggregateMode, string> = { sum: 'Soma', avg: 'Média', min: 'Mín', max: 'Máx' };
const AGG_CYCLE: AggregateMode[] = ['sum', 'avg', 'min', 'max'];

function computeAggregate(values: number[], mode: AggregateMode): number {
  if (values.length === 0) return 0;
  if (mode === 'sum') return values.reduce((a, b) => a + b, 0);
  if (mode === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
  if (mode === 'min') return Math.min(...values);
  return Math.max(...values);
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1.5px solid ${active ? 'var(--brand-500,#635BFF)' : 'var(--edge-strong,#d1d5db)'}`,
        background: active ? 'var(--brand-500,#635BFF)' : 'transparent',
        transition: 'background 120ms, border-color 120ms',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {checked && !indeterminate && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && (
        <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
          <path d="M1 1H7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

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
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
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
  selectedIds,
  onSelectionChange,
}: Props<T>) {
  const [aggModes, setAggModes] = useState<Record<string, AggregateMode>>({});
  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;
  const allSelected = selectable && rows.length > 0 && rows.every((r, i) => selectedIds!.has(rowKey(r, i)));
  const someSelected = selectable && !allSelected && rows.some((r, i) => selectedIds!.has(rowKey(r, i)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      rows.forEach((r, i) => next.delete(rowKey(r, i)));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      rows.forEach((r, i) => next.add(rowKey(r, i)));
      onSelectionChange(next);
    }
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelectionChange(next);
  };

  const gridTemplate = useMemo(() => {
    const cols = columns.map((c) => `${widths[c.key] ?? c.defaultWidth}px`).join(' ');
    const withTrailing = trailing ? `${cols} ${trailingWidth}px` : cols;
    return selectable ? `32px ${withTrailing}` : withTrailing;
  }, [columns, widths, trailing, trailingWidth, selectable]);

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
            {selectable && (
              <div className="flex items-center">
                <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
              </div>
            )}
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
              {rows.map((row, idx) => {
                const key = rowKey(row, idx);
                const isSelected = selectable && selectedIds!.has(key);
                return (
                  <div
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                    className={`group grid px-6 py-3 text-sm transition-colors items-center ${onRowClick ? 'hover:bg-[var(--surface-hover)] cursor-pointer' : ''} ${isSelected ? 'bg-[var(--brand-50,#eef2ff)]' : ''}`}
                    style={{
                      gridTemplateColumns: gridTemplate,
                      borderBottom: '1px solid var(--edge)',
                      color: 'var(--ink-1)',
                    }}
                  >
                    {selectable && (
                      <div className="flex items-center">
                        <Checkbox checked={isSelected} onChange={() => toggleRow(key)} />
                      </div>
                    )}
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className={`min-w-0 ${col.cellClassName ?? ''}`}
                        style={{ textAlign: col.align, paddingRight: 12 }}
                      >
                        {col.render(row, idx)}
                      </div>
                    ))}
                    {trailing && <div onClick={(e) => e.stopPropagation()}>{trailing(row, idx)}</div>}
                  </div>
                );
              })}

              {columns.some(c => c.getNumericValue) && (
                <div
                  className="grid px-6 py-2 text-xs font-medium"
                  style={{
                    gridTemplateColumns: gridTemplate,
                    borderTop: '2px solid var(--edge)',
                    background: 'var(--surface-hover, rgba(0,0,0,0.02))',
                    color: 'var(--ink-2)',
                  }}
                >
                  {selectable && <div />}
                  {columns.map((col) => {
                    if (!col.getNumericValue) return <div key={col.key} style={{ paddingRight: 12 }} />;
                    const mode = aggModes[col.key] ?? 'sum';
                    const vals = rows.map(r => col.getNumericValue!(r)).filter((v): v is number => v != null && !isNaN(v));
                    const result = computeAggregate(vals, mode);
                    const formatted = col.formatAggregate ? col.formatAggregate(result) : result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return (
                      <button
                        key={col.key}
                        onClick={() => setAggModes(prev => ({ ...prev, [col.key]: AGG_CYCLE[(AGG_CYCLE.indexOf(mode) + 1) % 4] }))}
                        title="Clique para alternar: Soma → Média → Mín → Máx"
                        className="text-left min-w-0 flex flex-col gap-0.5 hover:text-[var(--ink-1)] transition-colors"
                        style={{ paddingRight: 12, textAlign: col.align }}
                      >
                        <span className="text-[10px] uppercase tracking-wide opacity-60">{AGG_LABELS[mode]}</span>
                        <span className="font-semibold">{formatted}</span>
                      </button>
                    );
                  })}
                  {trailing && <div />}
                </div>
              )}
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
