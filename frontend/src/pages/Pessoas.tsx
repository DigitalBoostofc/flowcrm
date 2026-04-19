import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ArrowUpDown, Columns3, Download, Upload, Plus, X, Users,
} from 'lucide-react';
import { listContacts, createContact } from '@/api/contacts';
import { listCompanies } from '@/api/companies';
import { listPipelines } from '@/api/pipelines';
import { createLead } from '@/api/leads';
import { listUsers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import { usePanelStore } from '@/store/panel.store';
import type { Contact, User } from '@/types/api';

/* ── Form helpers ────────────────────────────────────── */

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{subtitle}</p>}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg outline-none text-sm focus:border-[var(--brand-500)]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        color: 'var(--ink-1)',
      }}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 rounded-lg outline-none text-sm resize-none"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        color: 'var(--ink-1)',
      }}
    />
  );
}

function Select({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg outline-none text-sm"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        color: value ? 'var(--ink-1)' : 'var(--ink-3)',
      }}
    >
      <option value="">{placeholder ?? 'Selecione'}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Avatar helpers ──────────────────────────────────── */

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#f97316', '#0ea5e9',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, id, size = 32 }: { name: string; id: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </div>
  );
}

/* ── AddNegocioModal ─────────────────────────────────── */

interface Produto {
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: 'value' | 'percent';
}

function emptyProduto(): Produto {
  return { productName: '', unitPrice: 0, quantity: 1, discount: 0, discountType: 'value' };
}

function AddNegocioModal({
  open, onClose, currentUser, users,
}: {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
}) {
  const qc = useQueryClient();

  const [entityType, setEntityType] = useState<'empresa' | 'pessoa'>('empresa');
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; kind: 'empresa' | 'pessoa' } | null>(null);

  const [form, setForm] = useState({
    title: '',
    responsibleId: currentUser?.id ?? '',
    pipelineId: '',
    startDate: '',
    conclusionDate: '',
    notes: '',
    privacy: 'all' as 'all' | 'restricted',
    additionalAccessUserIds: [] as string[],
  });
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setEntityType('empresa');
      setEntitySearch('');
      setSelectedEntity(null);
      setProdutos([]);
      setError('');
      setForm({
        title: '',
        responsibleId: currentUser?.id ?? '',
        pipelineId: '',
        startDate: '',
        conclusionDate: '',
        notes: '',
        privacy: 'all',
        additionalAccessUserIds: [],
      });
    }
  }, [open, currentUser]);

  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines, enabled: open });
  const { data: companies = [] } = useQuery({
    queryKey: ['companies', entitySearch],
    queryFn: () => listCompanies(entitySearch || undefined),
    enabled: open && entityType === 'empresa' && !selectedEntity && entitySearch.trim().length >= 1,
    staleTime: 10_000,
  });
  const { data: contactResults = [] } = useQuery({
    queryKey: ['contacts', entitySearch],
    queryFn: () => listContacts(entitySearch || undefined),
    enabled: open && entityType === 'pessoa' && !selectedEntity && entitySearch.trim().length >= 1,
    staleTime: 10_000,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Default pipeline selection once pipelines load
  useEffect(() => {
    if (open && pipelines.length && !form.pipelineId) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      if (def) set('pipelineId', def.id);
    }
  }, [open, pipelines]); // eslint-disable-line react-hooks/exhaustive-deps

  // Totals
  const totals = useMemo(() => {
    let valor = 0;
    let desconto = 0;
    for (const p of produtos) {
      const linha = p.unitPrice * p.quantity;
      const d = p.discountType === 'percent' ? (linha * p.discount) / 100 : p.discount;
      valor += linha;
      desconto += d;
    }
    return { valor, desconto, total: valor - desconto };
  }, [produtos]);

  const updateProduto = (idx: number, patch: Partial<Produto>) => {
    setProdutos((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.pipelineId) throw new Error('Selecione um funil.');
      const pipeline = pipelines.find((p) => p.id === form.pipelineId);
      if (!pipeline) throw new Error('Funil inválido.');
      const stage = [...(pipeline.stages ?? [])].sort((a, b) => a.position - b.position)[0];
      if (!stage) throw new Error('Pipeline sem etapas.');

      let contactId = selectedEntity?.kind === 'pessoa' ? selectedEntity.id : undefined;

      // If user picked an empresa, we still need a contact for the lead.
      // Create a placeholder contact tied to the company name so the lead has a valid FK.
      if (!contactId) {
        const name = selectedEntity?.name ?? entitySearch.trim();
        if (!name) throw new Error('Informe a empresa ou pessoa.');
        const c = await createContact({
          name,
          company: selectedEntity?.kind === 'empresa' ? selectedEntity.name : undefined,
        });
        contactId = c.id;
      }

      return createLead({
        contactId,
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: form.title.trim() || undefined,
        value: totals.total || undefined,
        notes: form.notes.trim() || undefined,
        assignedToId: form.responsibleId || undefined,
        startDate: form.startDate || undefined,
        conclusionDate: form.conclusionDate || undefined,
        privacy: form.privacy,
        additionalAccessUserIds: form.privacy === 'restricted' ? form.additionalAccessUserIds : [],
        items: produtos
          .filter((p) => p.productName.trim())
          .map((p) => ({
            productName: p.productName.trim(),
            unitPrice: Number(p.unitPrice) || 0,
            quantity: Number(p.quantity) || 0,
            discount: Number(p.discount) || 0,
            discountType: p.discountType,
          })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message || 'Erro ao criar negócio.'),
  });

  const toggleAccessUser = (id: string) => {
    set(
      'additionalAccessUserIds',
      form.additionalAccessUserIds.includes(id)
        ? form.additionalAccessUserIds.filter((x) => x !== id)
        : [...form.additionalAccessUserIds, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity && !entitySearch.trim()) {
      setError('Informe a empresa ou pessoa.');
      return;
    }
    if (!form.title.trim()) {
      setError('Nome do negócio é obrigatório.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  if (!open) return null;

  const money = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const entityOptions: { id: string; name: string }[] =
    entityType === 'empresa'
      ? companies.map((c) => ({ id: c.id, name: c.name }))
      : contactResults.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl max-w-3xl w-full my-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface-raised)', borderRadius: '12px 12px 0 0' }}
        >
          <h2 className="font-semibold text-lg" style={{ color: 'var(--ink-1)' }}>
            Adicionar novo negócio
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-2)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Entidade */}
          <section>
            <Label required>Empresa / Pessoa</Label>
            <div className="flex gap-2 mb-2">
              {(['empresa', 'pessoa'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setEntityType(t); setSelectedEntity(null); setEntitySearch(''); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: entityType === t ? 'var(--brand-500, #6366f1)' : 'var(--surface)',
                    color: entityType === t ? '#fff' : 'var(--ink-2)',
                    border: '1px solid var(--edge)',
                  }}
                >
                  {t === 'empresa' ? 'Empresa' : 'Pessoa'}
                </button>
              ))}
            </div>
            {selectedEntity ? (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
              >
                <span style={{ color: 'var(--ink-1)' }}>{selectedEntity.name}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedEntity(null); setEntitySearch(''); }}
                  style={{ color: 'var(--ink-3)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  placeholder={entityType === 'empresa' ? 'Buscar empresa...' : 'Buscar pessoa...'}
                />
                {entitySearch && entityOptions.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden shadow-lg max-h-40 overflow-y-auto"
                    style={{ background: 'var(--surface-overlay, var(--surface-raised))', border: '1px solid var(--edge-strong, var(--edge))' }}
                  >
                    {entityOptions.slice(0, 8).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => { setSelectedEntity({ ...o, kind: entityType }); setEntitySearch(o.name); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                        style={{ color: 'var(--ink-1)' }}
                      >
                        {o.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>
              Selecione um existente ou digite um nome para criar automaticamente.
            </p>
          </section>

          {/* Nome do negócio + responsável */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label required>Nome do negócio</Label>
              <Input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Venda de produto Y"
              />
            </div>
            <div>
              <Label>Responsável</Label>
              <Select
                value={form.responsibleId}
                onChange={(v) => set('responsibleId', v)}
                options={users.map((u) => ({
                  value: u.id,
                  label: u.id === currentUser?.id ? `Eu (${u.name})` : u.name,
                }))}
                placeholder="Selecione"
              />
            </div>
            <div>
              <Label>Valor total</Label>
              <Input
                readOnly
                value={money(totals.total)}
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--edge)',
                  color: 'var(--ink-2)',
                }}
              />
            </div>
            <div>
              <Label>Funil</Label>
              <Select
                value={form.pipelineId}
                onChange={(v) => set('pipelineId', v)}
                options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Selecione"
              />
            </div>
            <div />
            <div>
              <Label>Data de início</Label>
              <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <Label>Data de conclusão</Label>
              <Input type="date" value={form.conclusionDate} onChange={(e) => set('conclusionDate', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Escreva detalhes importantes sobre esse negócio"
              />
            </div>
          </section>

          {/* Privacidade */}
          <section>
            <SectionTitle title="Privacidade" subtitle="Quem pode ver o histórico e editar esse negócio?" />
            <div className="space-y-3">
              <label
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
                style={{
                  background: form.privacy === 'all' ? 'var(--surface-hover)' : 'var(--surface)',
                  border: `1px solid ${form.privacy === 'all' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
                }}
              >
                <input type="radio" checked={form.privacy === 'all'} onChange={() => set('privacy', 'all')} className="mt-1" />
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Todos</div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    Todos os usuários da conta terão acesso.
                  </div>
                </div>
              </label>

              <label
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
                style={{
                  background: form.privacy === 'restricted' ? 'var(--surface-hover)' : 'var(--surface)',
                  border: `1px solid ${form.privacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
                }}
              >
                <input type="radio" checked={form.privacy === 'restricted'} onChange={() => set('privacy', 'restricted')} className="mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Acesso restrito</div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    O responsável, seus líderes e os administradores da conta sempre terão acesso.
                  </div>
                  {form.privacy === 'restricted' && (
                    <div className="mt-3">
                      <Label>Acessos adicionais</Label>
                      <div
                        className="flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-lg min-h-[38px]"
                        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                      >
                        {form.additionalAccessUserIds.length === 0 && (
                          <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Selecionar...</span>
                        )}
                        {users
                          .filter((u) => form.additionalAccessUserIds.includes(u.id))
                          .map((u) => (
                            <span
                              key={u.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{ background: '#1f2937', color: '#fff' }}
                            >
                              {u.name}
                              <button type="button" onClick={() => toggleAccessUser(u.id)}>
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                      </div>
                      <div
                        className="mt-2 rounded-lg max-h-36 overflow-y-auto"
                        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                      >
                        {users
                          .filter((u) => !form.additionalAccessUserIds.includes(u.id) && u.id !== form.responsibleId)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleAccessUser(u.id)}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                              style={{ color: 'var(--ink-1)' }}
                            >
                              {u.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </section>

          {/* Produtos e serviços */}
          <section>
            <SectionTitle title="Produtos e serviços" subtitle="Adicione itens para compor o valor do negócio." />
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--edge)' }}
            >
              <div
                className="grid gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: '2fr 1fr 0.7fr 1fr 1.2fr 1fr 32px',
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-3)',
                  borderBottom: '1px solid var(--edge)',
                }}
              >
                <div>Item</div>
                <div>Preço unitário</div>
                <div>Qtd</div>
                <div>Total</div>
                <div>Desconto</div>
                <div>Total c/ desc.</div>
                <div />
              </div>

              {produtos.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--ink-3)' }}>
                  Nenhum produto adicionado.
                </div>
              ) : (
                produtos.map((p, idx) => {
                  const linha = p.unitPrice * p.quantity;
                  const desc = p.discountType === 'percent' ? (linha * p.discount) / 100 : p.discount;
                  return (
                    <div
                      key={idx}
                      className="grid gap-2 px-3 py-2 items-center"
                      style={{
                        gridTemplateColumns: '2fr 1fr 0.7fr 1fr 1.2fr 1fr 32px',
                        borderBottom: idx === produtos.length - 1 ? 'none' : '1px solid var(--edge)',
                      }}
                    >
                      <Input
                        value={p.productName}
                        onChange={(e) => updateProduto(idx, { productName: e.target.value })}
                        placeholder="Nome do produto"
                      />
                      <Input
                        type="number" min={0} step="0.01"
                        value={p.unitPrice || ''}
                        onChange={(e) => updateProduto(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                      />
                      <Input
                        type="number" min={0} step="1"
                        value={p.quantity || ''}
                        onChange={(e) => updateProduto(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <div className="text-sm" style={{ color: 'var(--ink-2)' }}>{money(linha)}</div>
                      <div className="flex gap-1">
                        <Input
                          type="number" min={0} step="0.01"
                          value={p.discount || ''}
                          onChange={(e) => updateProduto(idx, { discount: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                        <select
                          value={p.discountType}
                          onChange={(e) => updateProduto(idx, { discountType: e.target.value as 'value' | 'percent' })}
                          className="px-2 rounded-lg text-xs outline-none"
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--edge)',
                            color: 'var(--ink-1)',
                          }}
                        >
                          <option value="value">R$</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>{money(linha - desc)}</div>
                      <button
                        type="button"
                        onClick={() => setProdutos((arr) => arr.filter((_, i) => i !== idx))}
                        className="p-1 rounded hover:bg-[var(--surface-hover)]"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setProdutos((arr) => [...arr, emptyProduto()])}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ color: 'var(--brand-500, #6366f1)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item
            </button>

            {/* Summary */}
            <div
              className="mt-4 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Valor</div>
                <div className="font-semibold" style={{ color: 'var(--ink-1)' }}>{money(totals.valor)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Valor do desconto</div>
                <div className="font-semibold" style={{ color: 'var(--ink-1)' }}>{money(totals.desconto)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Valor total</div>
                <div className="font-semibold" style={{ color: 'var(--brand-500, #6366f1)' }}>{money(totals.total)}</div>
              </div>
            </div>
          </section>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 sticky bottom-0"
          style={{ borderTop: '1px solid var(--edge)', background: 'var(--surface-raised)', borderRadius: '0 0 12px 12px' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-2)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar negócio'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-hover)' }}
      >
        <Users className="w-12 h-12" style={{ color: 'var(--brand-500, #6366f1)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
        Cadastre as pessoas da sua rede
      </h3>
      <p className="text-sm mb-5 max-w-sm" style={{ color: 'var(--ink-3)' }}>
        Você ainda não cadastrou pessoas. Crie um novo negócio e vincule um contato para começar.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
        style={{ background: 'var(--brand-500, #6366f1)' }}
      >
        <Plus className="w-4 h-4" />
        Adicionar
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

export default function Pessoas() {
  const user = useAuthStore((s) => s.user);
  const openPanel = usePanelStore((s) => s.open);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['pessoas', debouncedSearch],
    queryFn: () => listContacts(debouncedSearch || undefined),
  });

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const total = contacts.length;

  return (
    <div className="p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--ink-3)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, nome da empresa, e-mail ou telefone"
              className="w-full pl-9 pr-3 py-2 rounded-lg outline-none text-sm"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
              }}
            />
          </div>

          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <ArrowUpDown className="w-4 h-4" />
            Ordenar
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <Columns3 className="w-4 h-4" />
            Colunas
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        <div
          className="grid gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wide"
          style={{
            gridTemplateColumns: '48px 2fr 1.4fr 1fr 1.4fr 1.6fr',
            borderBottom: '1px solid var(--edge)',
            color: 'var(--ink-2)',
          }}
        >
          <div>#</div>
          <div>Nome</div>
          <div>Empresa</div>
          <div>Categoria</div>
          <div>Responsável</div>
          <div>Email</div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>
            Carregando...
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <div>
            {contacts.map((c: Contact, idx) => {
              const responsavel = c.responsibleId ? userById.get(c.responsibleId) : null;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (c.leads && c.leads.length > 0) openPanel(c.leads[0].id);
                  }}
                  className="grid gap-4 px-6 py-3 text-sm transition-colors hover:bg-[var(--surface-hover)] cursor-pointer items-center"
                  style={{
                    gridTemplateColumns: '48px 2fr 1.4fr 1fr 1.4fr 1.6fr',
                    borderBottom: '1px solid var(--edge)',
                    color: 'var(--ink-1)',
                  }}
                >
                  <div className="text-xs font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={c.name} id={c.id} size={28} />
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <div className="truncate" style={{ color: 'var(--ink-2)' }}>{c.company ?? '—'}</div>
                  <div className="truncate" style={{ color: 'var(--ink-2)' }}>
                    {c.categoria ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
                      >
                        {c.categoria}
                      </span>
                    ) : '—'}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {responsavel ? (
                      <>
                        <Avatar name={responsavel.name} id={responsavel.id} size={26} />
                        <span className="truncate" style={{ color: 'var(--ink-2)' }}>{responsavel.name}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </div>
                  <div className="truncate" style={{ color: 'var(--ink-2)' }}>{c.email ?? '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end text-xs" style={{ color: 'var(--ink-3)' }}>
        Exibindo {total} de {total} pessoa{total !== 1 ? 's' : ''}
      </div>

      <AddNegocioModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentUser={user}
        users={users}
      />
    </div>
  );
}
