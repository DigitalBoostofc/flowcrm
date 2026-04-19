import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Pencil, Trash2, X, UserPlus } from 'lucide-react';

export interface NamedOption {
  id: string;
  name: string;
  createdAt: string;
}

export interface OptionsListTabProps<T extends { id: string; createdAt: string }> {
  title: string;
  subtitle: string;
  queryKey: readonly unknown[];
  list: () => Promise<T[]>;
  create: (name: string) => Promise<T>;
  update: (id: string, name: string) => Promise<T>;
  remove: (id: string) => Promise<void>;
  nameOf: (item: T) => string;
  addModalTitle: string;
  addModalHint: string;
  placeholder?: string;
  confirmDeleteMessage?: (name: string) => string;
}

function formatDateBR(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${year} às ${hh}:${mm}`;
}

export default function OptionsListTab<T extends { id: string; createdAt: string }>(props: OptionsListTabProps<T>) {
  const {
    title, subtitle, queryKey, list, create, update, remove, nameOf,
    addModalTitle, addModalHint, placeholder = 'Buscar por nome',
    confirmDeleteMessage = (n) => `Excluir "${n}"?`,
  } = props;

  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey, queryFn: list });

  const createMut = useMutation({
    mutationFn: async (names: string[]) => {
      for (const n of names) {
        await create(n);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => update(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter((x) => nameOf(x).toLowerCase().includes(s));
  }, [data, search, nameOf]);

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditDraft(currentName);
  };

  const commitEdit = (id: string, currentName: string) => {
    const trimmed = editDraft.trim();
    setEditingId(null);
    if (!trimmed || trimmed === currentName) return;
    updateMut.mutate({ id, name: trimmed });
  };

  const cancelEdit = () => setEditingId(null);

  const onDelete = (item: T) => {
    if (confirm(confirmDeleteMessage(nameOf(item)))) {
      deleteMut.mutate(item.id);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
          {title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-2xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--ink-3)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
            }}
          />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'var(--brand-500, #6366f1)' }}
        >
          <UserPlus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Table header */}
      <div
        className="grid items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide"
        style={{
          gridTemplateColumns: '1fr 220px 120px',
          color: 'var(--ink-2)',
          borderBottom: '1px solid var(--edge-strong, var(--edge))',
        }}
      >
        <div>Nome</div>
        <div>Data de criação</div>
        <div />
      </div>

      {isLoading ? (
        <div className="text-sm py-6 text-center" style={{ color: 'var(--ink-3)' }}>
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>
          {search ? 'Nenhum resultado.' : 'Nada cadastrado ainda.'}
        </div>
      ) : (
        <div>
          {filtered.map((item) => {
            const name = nameOf(item);
            const editing = editingId === item.id;
            return (
              <div
                key={item.id}
                className="group grid items-center gap-3 px-4 py-3"
                style={{
                  gridTemplateColumns: '1fr 220px 120px',
                  borderBottom: '1px solid var(--edge)',
                }}
              >
                <div className="min-w-0">
                  {editing ? (
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => commitEdit(item.id, name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-full max-w-sm px-3 py-1.5 rounded-md outline-none text-sm"
                      style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--brand-500, #6366f1)',
                        color: 'var(--ink-1)',
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(item.id, name)}
                      className="flex items-center gap-2 text-sm text-left rounded-md px-2 py-1 -ml-2 transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ color: 'var(--ink-1)' }}
                    >
                      <span className="truncate">{name}</span>
                      <Pencil
                        className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--brand-500, #6366f1)' }}
                      />
                    </button>
                  )}
                </div>
                <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
                  {formatDateBR(item.createdAt)}
                </div>
                <button
                  onClick={() => onDelete(item)}
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
        <AddOptionsModal
          title={addModalTitle}
          hint={addModalHint}
          onClose={() => setAddOpen(false)}
          onSave={(names) => {
            createMut.mutate(names, {
              onSuccess: () => setAddOpen(false),
            });
          }}
          pending={createMut.isPending}
        />
      )}
    </div>
  );
}

function AddOptionsModal({
  title, hint, onClose, onSave, pending,
}: {
  title: string;
  hint: string;
  onClose: () => void;
  onSave: (names: string[]) => void;
  pending: boolean;
}) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const parseNames = (s: string): string[] =>
    s.split(',').map((x) => x.trim()).filter(Boolean);

  const names = parseNames(text);
  const canSave = names.length > 0 && !pending;

  const handleSave = () => {
    if (!canSave) return;
    onSave(names);
  };

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
        className="rounded-2xl shadow-2xl max-w-md w-full animate-fade-up"
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
            <Plus className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ink-1)' }}>
            {title}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
            {hint}
          </p>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite os nomes"
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg outline-none text-sm resize-y"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
              minHeight: 80,
            }}
          />
          <div className="mt-5 flex items-center justify-end gap-3 w-full">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
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
