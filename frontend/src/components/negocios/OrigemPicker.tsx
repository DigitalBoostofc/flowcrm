import { useEffect, useRef, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { createCustomerOrigin, type CustomerOrigin } from '@/api/customer-origins';

interface Props {
  value: string | null | undefined;
  origins: CustomerOrigin[];
  onChange: (id: string | null) => void;
}

export default function OrigemPicker({ value, origins, onChange }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = origins.find(o => o.id === value);

  useEffect(() => {
    if (!open) return;
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setAdding(false);
        setNewName('');
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 80);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const createMut = useMutation({
    mutationFn: (name: string) => createCustomerOrigin(name),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['customer-origins'] });
      onChange(created.id);
      setOpen(false);
      setAdding(false);
      setNewName('');
    },
  });

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    createMut.mutate(name);
  };

  return (
    <>
      <button
        ref={anchorRef}
        onClick={() => setOpen(o => !o)}
        className="text-sm text-left truncate"
        style={{ color: selected ? 'var(--ink-1)' : 'var(--brand-500, #6366f1)' }}
      >
        {selected ? selected.name : 'Selecionar'}
      </button>

      {open && (
        <div
          ref={panelRef}
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
          <div className="px-2 py-1.5 max-h-52 overflow-y-auto">
            {origins.length === 0 && !adding && (
              <p className="text-xs text-center py-2" style={{ color: 'var(--ink-3)' }}>Nenhuma origem</p>
            )}
            {origins.map(o => (
              <button
                key={o.id}
                onClick={() => { onChange(o.id === value ? null : o.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {o.id === value && <Check className="w-3.5 h-3.5" style={{ color: 'var(--brand-500, #6366f1)' }} strokeWidth={3} />}
                </div>
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink-1)', fontWeight: o.id === value ? 600 : 400 }}>
                  {o.name}
                </span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--edge)', padding: '6px 8px' }}>
            {adding ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                  placeholder="Nome da origem..."
                  className="flex-1 px-2 py-1 text-xs rounded-md outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                />
                <button
                  onClick={handleSave}
                  disabled={!newName.trim() || createMut.isPending}
                  className="px-2 py-1 rounded-md text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: 'var(--brand-500, #6366f1)' }}
                >
                  {createMut.isPending ? '...' : 'Ok'}
                </button>
                <button
                  onClick={() => { setAdding(false); setNewName(''); }}
                  className="p-1 rounded-md hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--brand-500, #6366f1)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar origem
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
