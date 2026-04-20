import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Tag, Search } from 'lucide-react';
import { listLabels, addLabelToLead, removeLabelFromLead, type Label } from '@/api/labels';

interface Props {
  leadId: string;
  leadLabels: Label[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export default function LabelPicker({ leadId, leadLabels, onClose, anchorRef }: Props) {
  const qc = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState('');
  const leadLabelIds = new Set(leadLabels.map(l => l.id));

  const { data: allLabels = [] } = useQuery({ queryKey: ['labels'], queryFn: listLabels });

  const filtered = allLabels.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose, anchorRef]);

  const toggleMut = useMutation({
    mutationFn: (label: Label) =>
      leadLabelIds.has(label.id)
        ? removeLabelFromLead(leadId, label.id)
        : addLabelToLead(leadId, label.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['negocios'] }),
  });

  return (
    <div
      ref={panelRef}
      className="animate-fade-up"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 220,
        zIndex: 9999,
        background: 'var(--surface-raised)',
        border: '1px solid var(--edge-strong)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden',
      }}
    >
      <div className="px-3 pt-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-3)' }}>
          Etiquetas
        </p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'var(--ink-3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          />
        </div>
      </div>

      <div className="px-2 pb-2 max-h-52 overflow-y-auto space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: 'var(--ink-3)' }}>Nenhuma etiqueta</p>
        )}
        {filtered.map(label => {
          const active = leadLabelIds.has(label.id);
          return (
            <button
              key={label.id}
              onClick={() => toggleMut.mutate(label)}
              disabled={toggleMut.isPending}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              <div
                className="w-6 h-4 rounded flex-shrink-0 flex items-center justify-center"
                style={{ background: label.color }}
              >
                {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--ink-1)', fontWeight: active ? 600 : 400 }}>
                {label.name || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>sem nome</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
