import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Tag } from 'lucide-react';
import {
  listLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  type Label,
} from '@/api/labels';

const QUERY_KEY = ['labels'] as const;

function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(value);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative w-8 h-8 rounded-md border cursor-pointer flex-shrink-0 overflow-hidden"
        style={{ borderColor: 'var(--edge)', backgroundColor: isValidHex(value) ? value : '#6366f1' }}
        onClick={() => pickerRef.current?.click()}
        title="Escolher cor"
      >
        <input
          ref={pickerRef}
          type="color"
          value={isValidHex(value) ? value : '#6366f1'}
          onChange={(e) => {
            onChange(e.target.value);
            setText(e.target.value);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          tabIndex={-1}
        />
      </div>
      <input
        type="text"
        value={text}
        maxLength={7}
        onChange={(e) => {
          let v = e.target.value;
          if (!v.startsWith('#')) v = '#' + v;
          setText(v);
          if (isValidHex(v)) onChange(v);
        }}
        className="w-24 px-2 py-1.5 rounded-md outline-none text-sm font-mono"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--edge)',
          color: 'var(--ink-1)',
        }}
        placeholder="#6366f1"
      />
    </div>
  );
}

function AddLabelModal({
  onClose,
  onSave,
  pending,
}: {
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const canSave = name.trim().length > 0 && isValidHex(color) && !pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30, 27, 75, 0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center shadow-md"
        style={{ background: '#1e1b4b', color: '#fff' }}
        title="Fechar"
      >
        <X className="w-4 h-4" />
      </button>

      <div
        className="rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface-raised)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Tag className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--ink-1)' }}>
            Nova etiqueta
          </h3>

          <div className="w-full space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-3)' }}>
                Nome
              </label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSave) onSave(name.trim(), color);
                  if (e.key === 'Escape') onClose();
                }}
                placeholder="Ex: Urgente, Cliente VIP..."
                className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--edge)',
                  color: 'var(--ink-1)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-3)' }}>
                Cor
              </label>
              <ColorInput value={color} onChange={setColor} />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 w-full">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => canSave && onSave(name.trim(), color)}
              disabled={!canSave}
              className="px-6 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditState {
  id: string;
  name: string;
  color: string;
}

export default function EtiquetasTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);

  const { data: labels = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listLabels,
    select: (items) => [...items].sort((a, b) => a.position - b.position),
  });

  const createMut = useMutation({
    mutationFn: (data: { name: string; color: string }) => createLabel(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string; position?: number }) =>
      updateLabel(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLabel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const startEdit = (label: Label) => {
    setEditing({ id: label.id, name: label.name, color: label.color });
  };

  const commitEdit = () => {
    if (!editing) return;
    const original = labels.find((l) => l.id === editing.id);
    if (!original) { setEditing(null); return; }
    const nameChanged = editing.name.trim() !== original.name;
    const colorChanged = editing.color !== original.color;
    if ((nameChanged || colorChanged) && editing.name.trim() && isValidHex(editing.color)) {
      updateMut.mutate({ id: editing.id, name: editing.name.trim(), color: editing.color });
    }
    setEditing(null);
  };

  const moveLabel = (index: number, direction: -1 | 1) => {
    const target = labels[index];
    const swap = labels[index + direction];
    if (!target || !swap) return;
    updateMut.mutate({ id: target.id, position: swap.position });
    updateMut.mutate({ id: swap.id, position: target.position });
  };

  const onDelete = (label: Label) => {
    if (confirm(`Excluir a etiqueta "${label.name}"?`)) {
      deleteMut.mutate(label.id);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
          Etiquetas
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
          Gerencie as etiquetas do workspace para categorizar conversas e negócios.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'var(--brand-500, #6366f1)' }}
        >
          <Plus className="w-4 h-4" />
          Nova etiqueta
        </button>
      </div>

      {/* Table header */}
      <div
        className="grid items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide"
        style={{
          gridTemplateColumns: '1fr 100px 130px',
          color: 'var(--ink-2)',
          borderBottom: '1px solid var(--edge-strong, var(--edge))',
        }}
      >
        <div>Etiqueta</div>
        <div>Ordem</div>
        <div />
      </div>

      {isLoading ? (
        <div className="text-sm py-6 text-center" style={{ color: 'var(--ink-3)' }}>
          Carregando...
        </div>
      ) : labels.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>
          Nenhuma etiqueta cadastrada.
        </div>
      ) : (
        <div>
          {labels.map((label, index) => {
            const isEditing = editing?.id === label.id;
            return (
              <div
                key={label.id}
                className="group grid items-center gap-3 px-4 py-3"
                style={{
                  gridTemplateColumns: '1fr 100px 130px',
                  borderBottom: '1px solid var(--edge)',
                }}
              >
                {/* Name + color */}
                <div className="min-w-0">
                  {isEditing && editing ? (
                    <div className="flex items-center gap-3">
                      <ColorInput
                        value={editing.color}
                        onChange={(c) => setEditing((prev) => prev ? { ...prev, color: c } : prev)}
                      />
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className="flex-1 max-w-xs px-3 py-1.5 rounded-md outline-none text-sm"
                        style={{
                          background: 'var(--surface-raised)',
                          border: '1px solid var(--brand-500, #6366f1)',
                          color: 'var(--ink-1)',
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(label)}
                      className="flex items-center gap-2.5 text-sm text-left rounded-md px-2 py-1 -ml-2 transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ color: 'var(--ink-1)' }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate">{label.name}</span>
                      <Pencil
                        className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--brand-500, #6366f1)' }}
                      />
                    </button>
                  )}
                </div>

                {/* Reorder buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveLabel(index, -1)}
                    disabled={index === 0 || updateMut.isPending}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-25"
                    style={{ color: 'var(--ink-2)' }}
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveLabel(index, 1)}
                    disabled={index === labels.length - 1 || updateMut.isPending}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-25"
                    style={{ color: 'var(--ink-2)' }}
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(label)}
                  disabled={deleteMut.isPending}
                  className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && (
        <AddLabelModal
          onClose={() => setAddOpen(false)}
          onSave={(name, color) => {
            createMut.mutate({ name, color }, {
              onSuccess: () => setAddOpen(false),
            });
          }}
          pending={createMut.isPending}
        />
      )}
    </div>
  );
}
