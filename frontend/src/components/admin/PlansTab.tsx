import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Star, CheckCircle2 } from 'lucide-react';
import {
  adminListPlans,
  adminGetFeatureCatalog,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
  type Plan,
  type CreatePlanInput,
  type FeatureDef,
} from '@/api/workspace';

export default function PlansTab() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ['admin-plans'], queryFn: adminListPlans });
  const { data: catalog = [] } = useQuery({ queryKey: ['admin-plans-catalog'], queryFn: adminGetFeatureCatalog });

  const [editing, setEditing] = useState<Plan | 'new' | null>(null);

  const delMut = useMutation({
    mutationFn: adminDeletePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
    onError: (err: any) => {
      alert(err?.response?.data?.message ?? 'Erro ao excluir');
    },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Cadastre os planos disponíveis para venda e marque quais funcionalidades cada um libera.
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Novo plano
        </button>
      </div>

      <div className="grid gap-3">
        {plans.length === 0 && (
          <div
            className="rounded-xl p-8 text-center text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
          >
            Nenhum plano cadastrado ainda.
          </div>
        )}
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-4 flex items-start gap-4"
            style={{
              background: 'var(--surface)',
              border: p.highlight ? '2px solid var(--brand-500)' : '1px solid var(--edge)',
              opacity: p.active ? 1 : 0.55,
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>{p.name}</h3>
                {p.highlight && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
                    <Star className="w-2.5 h-2.5" fill="currentColor" /> Destaque
                  </span>
                )}
                {p.slug === 'trial' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: '#fef3c7', color: '#a16207' }}>
                    Trial
                  </span>
                )}
                {!p.active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--surface-hover)', color: 'var(--ink-3)' }}>Inativo</span>
                )}
                <span className="text-[10px] font-mono" style={{ color: 'var(--ink-3)' }}>{p.slug}</span>
              </div>
              {p.description && (
                <p className="text-xs mb-2" style={{ color: 'var(--ink-3)' }}>{p.description}</p>
              )}
              <div className="text-base font-semibold mb-2" style={{ color: 'var(--ink-1)' }}>
                {formatPrice(p.priceMonthlyCents)}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--ink-3)' }}>/mês</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catalog.map((f) => {
                  const included = p.features.includes(f.key);
                  return (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        background: included ? 'var(--brand-50)' : 'var(--surface-hover)',
                        color: included ? 'var(--brand-500)' : 'var(--ink-3)',
                      }}
                    >
                      {included && <CheckCircle2 className="w-3 h-3" />}
                      {f.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => setEditing(p)}
                className="p-2 rounded hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--ink-2)' }}
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {p.slug !== 'trial' && (
                <button
                  onClick={() => {
                    if (confirm(`Excluir o plano "${p.name}"?`)) delMut.mutate(p.id);
                  }}
                  className="p-2 rounded hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--ink-3)' }}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <PlanFormModal
          plan={editing === 'new' ? null : editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin-plans'] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PlanFormModal({
  plan,
  catalog,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  catalog: FeatureDef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!plan;
  const [slug, setSlug] = useState(plan?.slug ?? '');
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [priceReais, setPriceReais] = useState(plan ? (plan.priceMonthlyCents / 100).toFixed(2) : '0.00');
  const [features, setFeatures] = useState<string[]>(plan?.features ?? []);
  const [highlight, setHighlight] = useState(plan?.highlight ?? false);
  const [active, setActive] = useState(plan?.active ?? true);
  const [sortOrder, setSortOrder] = useState(plan?.sortOrder ?? 0);

  const input: CreatePlanInput = useMemo(
    () => ({
      slug,
      name,
      description,
      priceMonthlyCents: Math.round(parseFloat(priceReais || '0') * 100),
      features,
      highlight,
      active,
      sortOrder,
    }),
    [slug, name, description, priceReais, features, highlight, active, sortOrder],
  );

  const saveMut = useMutation({
    mutationFn: () =>
      plan ? adminUpdatePlan(plan.id, input) : adminCreatePlan(input),
    onSuccess: onSaved,
    onError: (err: any) => {
      alert(err?.response?.data?.message ?? 'Erro ao salvar');
    },
  });

  const toggleFeature = (key: string) => {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>
          {isEdit ? 'Editar plano' : 'Novo plano'}
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Pro"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Slug (identificador)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
                placeholder="ex: pro"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                disabled={isEdit}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Curta descrição do plano"
              className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Preço mensal (R$)</label>
              <input
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Ordem</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--ink-3)' }}>Funcionalidades incluídas</label>
            <div className="space-y-1.5">
              {catalog.map((f) => (
                <label
                  key={f.key}
                  className="flex items-start gap-2 p-2 rounded-lg cursor-pointer"
                  style={{
                    background: features.includes(f.key) ? 'var(--brand-50)' : 'var(--surface)',
                    border: '1px solid var(--edge)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={features.includes(f.key)}
                    onChange={() => toggleFeature(f.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{f.label}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{f.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-1)' }}>
              <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
              Destaque (Mais popular)
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-1)' }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Ativo
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: 'var(--ink-2)' }}>
            Cancelar
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!slug || !name || saveMut.isPending}
            className="px-4 py-1.5 text-sm rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500)' }}
          >
            {saveMut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
