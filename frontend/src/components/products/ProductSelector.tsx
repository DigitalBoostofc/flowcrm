import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import {
  createProduct,
  listProducts,
  type ProductInput,
} from '@/api/products';
import ProductFormModal from './ProductFormModal';

interface Props {
  value: string[];
  onChange: (names: string[]) => void;
  placeholder?: string;
}

export default function ProductSelector({
  value,
  onChange,
  placeholder = 'Buscar ou selecionar...',
}: Props) {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data = [] } = useQuery({
    queryKey: ['products', { onlyActive: true }],
    queryFn: () => listProducts({ onlyActive: true }),
    select: (r) => r.items,
  });

  const createMut = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      if (!value.includes(p.name)) onChange([...value, p.name]);
      setAddOpen(false);
      setFormError(null);
      setQuery('');
    },
    onError: (e: any) => {
      setFormError(e?.response?.data?.message ?? 'Erro ao salvar');
    },
  });

  const available = useMemo(() => {
    const selected = new Set(value);
    const q = query.trim().toLowerCase();
    return data
      .filter((p) => !selected.has(p.name))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 30);
  }, [data, value, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return data.find((p) => p.name.toLowerCase() === q) ?? null;
  }, [data, query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (name: string) => {
    if (!value.includes(name)) onChange([...value, name]);
    setQuery('');
    setOpen(false);
  };

  const remove = (name: string) => {
    onChange(value.filter((n) => n !== name));
  };

  const openAdd = () => {
    setFormError(null);
    setAddOpen(true);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--ink-3)' }}
          />
          <input
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (available.length > 0) pick(available[0].name);
                else if (query.trim()) openAdd();
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
            }}
          />
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium"
          style={{
            background: 'var(--surface-hover)',
            color: 'var(--ink-2)',
            border: '1px solid var(--edge)',
          }}
          title="Cadastrar novo produto/serviço"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--edge)',
          }}
        >
          {available.length === 0 && !query.trim() && (
            <div className="px-3 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>
              Nenhum produto disponível. Clique em "Novo" para cadastrar.
            </div>
          )}

          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.name)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-1)' }}
            >
              <span className="truncate">{p.name}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: 'var(--surface-hover)',
                  color: 'var(--ink-3)',
                }}
              >
                {p.type === 'servico' ? 'Serviço' : 'Produto'}
              </span>
            </button>
          ))}

          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={openAdd}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--brand-500, #6366f1)', borderTop: available.length ? '1px solid var(--edge)' : undefined }}
            >
              <Plus className="w-4 h-4" />
              Criar "{query.trim()}"
            </button>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
              style={{ background: '#1f2937', color: '#fff' }}
            >
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={`Remover ${name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {addOpen && (
        <ProductFormModal
          initialName={query.trim() || undefined}
          onClose={() => setAddOpen(false)}
          onSubmit={(input) => createMut.mutateAsync(input)}
          pending={createMut.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
