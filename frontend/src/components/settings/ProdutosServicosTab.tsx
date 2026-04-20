import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Pencil, Trash2, Plus } from 'lucide-react';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type Product,
  type ProductInput,
} from '@/api/products';
import ProductFormModal from '@/components/products/ProductFormModal';

function formatPrice(price: string | null): string {
  if (price == null) return '—';
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export default function ProdutosServicosTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => listProducts(),
  });

  const createMut = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setAddOpen(false);
      setFormError(null);
    },
    onError: (e: any) => {
      setFormError(e?.response?.data?.message ?? 'Erro ao salvar');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      updateProduct(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
      setFormError(null);
    },
    onError: (e: any) => {
      setFormError(e?.response?.data?.message ?? 'Erro ao salvar');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter((x) => x.name.toLowerCase().includes(s));
  }, [data, search]);

  const onDelete = (p: Product) => {
    if (confirm(`Excluir "${p.name}"?`)) deleteMut.mutate(p.id);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
          Produtos e serviços
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
          Catálogo de itens disponíveis para seleção no cadastro de negócios.
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
            placeholder="Buscar por nome"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
            }}
          />
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'var(--brand-500, #6366f1)' }}
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div
        className="grid items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide"
        style={{
          gridTemplateColumns: '1fr 110px 140px 80px 110px',
          color: 'var(--ink-2)',
          borderBottom: '1px solid var(--edge-strong, var(--edge))',
        }}
      >
        <div>Nome</div>
        <div>Tipo</div>
        <div>Preço</div>
        <div>Ativo</div>
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
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group grid items-center gap-3 px-4 py-3"
              style={{
                gridTemplateColumns: '1fr 110px 140px 80px 110px',
                borderBottom: '1px solid var(--edge)',
              }}
            >
              <button
                onClick={() => {
                  setFormError(null);
                  setEditing(p);
                }}
                className="flex items-center gap-2 text-sm text-left rounded-md px-2 py-1 -ml-2 transition-colors hover:bg-[var(--surface-hover)] min-w-0"
                style={{ color: 'var(--ink-1)' }}
              >
                <span className="truncate">{p.name}</span>
                <Pencil
                  className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--brand-500, #6366f1)' }}
                />
              </button>
              <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {p.type === 'servico' ? 'Serviço' : 'Produto'}
              </div>
              <div className="text-sm tabular-nums" style={{ color: 'var(--ink-2)' }}>
                {formatPrice(p.price)}
              </div>
              <div className="text-sm" style={{ color: p.active ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                {p.active ? 'Sim' : 'Não'}
              </div>
              <button
                onClick={() => onDelete(p)}
                disabled={deleteMut.isPending}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{ color: '#dc2626' }}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <ProductFormModal
          onClose={() => setAddOpen(false)}
          onSubmit={(input) => createMut.mutateAsync(input)}
          pending={createMut.isPending}
          error={formError}
        />
      )}

      {editing && (
        <ProductFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(input) =>
            updateMut.mutateAsync({ id: editing.id, input })
          }
          pending={updateMut.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
