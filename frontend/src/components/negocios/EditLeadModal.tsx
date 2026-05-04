import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { X, Users as UsersIcon, Lock, Plus, Trash2 } from 'lucide-react';
import type { Lead, Pipeline, User } from '@/types/api';
import { updateLead, moveLead, LeadItemInput } from '@/api/leads';
import Avatar from '@/components/ui/Avatar';
import { ProductDraft, emptyProductDraft, ProductNameField, ProductPickerCombo } from '@/pages/Negocios';
import { formatBRL } from '@/lib/format';

type Privacy = 'all' | 'restricted';

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink-1)' }}>{title}</h3>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
      {children}
      {required && <span className="ml-1" style={{ color: 'var(--danger, #ef4444)' }}>*</span>}
    </label>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg outline-none text-sm"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        color: 'var(--ink-1)',
        ...props.style,
      }}
    />
  );
}

interface Props {
  lead: Lead;
  pipelines: Pipeline[];
  users: User[];
  currentUser?: User | null;
  open: boolean;
  onClose: () => void;
}

export default function EditLeadModal({ lead, pipelines, users, currentUser, open, onClose }: Props) {
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [value, setValue] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [conclusionDate, setConclusionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('all');
  const [additionalAccess, setAdditionalAccess] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(lead.title ?? '');
    setAssignedToId(lead.assignedToId ?? '');
    setValue(lead.value != null ? String(lead.value) : '');
    setPipelineId(lead.pipelineId ?? '');
    setStartDate(lead.startDate ? String(lead.startDate).slice(0, 10) : '');
    setConclusionDate(lead.conclusionDate ? String(lead.conclusionDate).slice(0, 10) : '');
    setNotes(lead.notes ?? '');
    setPrivacy(lead.privacy ?? 'all');
    setAdditionalAccess(lead.additionalAccessUserIds ?? []);
    setProducts(
      (lead.items ?? []).map((it) => ({
        productName: it.productName,
        unitPrice: String(it.unitPrice),
        quantity: String(it.quantity),
        discount: String(it.discount),
        discountType: it.discountType,
      })),
    );
    setError('');
  }, [open, lead]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('title');

      const items: LeadItemInput[] = products
        .filter((p) => p.productName.trim())
        .map((p) => ({
          productName: p.productName.trim(),
          unitPrice: Number(p.unitPrice) || 0,
          quantity: Number(p.quantity) || 1,
          discount: Number(p.discount) || 0,
          discountType: p.discountType,
        }));

      const updates: Promise<unknown>[] = [
        updateLead(lead.id, {
          title: title.trim(),
          value: value !== '' ? Number(value) : null,
          assignedToId: assignedToId || null,
          startDate: startDate || null,
          conclusionDate: conclusionDate || null,
          notes: notes.trim() || undefined,
          privacy,
          additionalAccessUserIds: privacy === 'restricted' ? additionalAccess : [],
          items,
        }),
      ];

      if (pipelineId && pipelineId !== lead.pipelineId) {
        const target = pipelines.find((p) => p.id === pipelineId);
        const firstStage = target?.stages?.slice().sort((a, b) => a.position - b.position)[0];
        if (firstStage) updates.push(moveLead(lead.id, firstStage.id));
      }

      return Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      onClose();
    },
    onError: (err: any) => {
      if (err?.message === 'title') { setError('Informe o nome do negócio.'); return; }
      setError(err?.response?.data?.message ?? 'Erro ao salvar negócio.');
    },
  });

  const updateProduct = (idx: number, patch: Partial<ProductDraft>) =>
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const removeProduct = (idx: number) => setProducts((prev) => prev.filter((_, i) => i !== idx));
  const productTotal = (p: ProductDraft) => {
    const subtotal = (Number(p.unitPrice) || 0) * (Number(p.quantity) || 1);
    const disc = Number(p.discount) || 0;
    return p.discountType === 'percent' ? subtotal * (1 - disc / 100) : subtotal - disc;
  };
  const productsTotal = products.reduce((s, p) => s + productTotal(p), 0);

  if (!open) return null;

  const linkedName = lead.company?.name ?? lead.contact?.name ?? '—';
  const linkedAvatar = (lead.company as any)?.avatarUrl ?? lead.contact?.avatarUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl w-full sm:max-w-3xl my-4 sm:my-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--edge)',
            background: 'var(--surface-raised)',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)' }}>Editar negócio</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="px-6 py-5 space-y-8"
        >
          {/* Dados básicos */}
          <section>
            <SectionTitle title="Dados básicos" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Empresa / Pessoa — read-only */}
              <div>
                <Label>Empresa / Pessoa</Label>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  <Avatar name={linkedName} url={linkedAvatar} size={24} />
                  <span className="text-sm" style={{ color: 'var(--ink-1)' }}>{linkedName}</span>
                </div>
              </div>

              <div>
                <Label required>Nome do negócio</Label>
                <FieldInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Proposta comercial"
                  autoFocus
                />
              </div>

              <div>
                <Label>Responsável</Label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: assignedToId ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {currentUser && u.id === currentUser.id ? `Eu (${u.name})` : u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Valor total</Label>
                <FieldInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label>Funil</Label>
                <select
                  value={pipelineId}
                  onChange={(e) => setPipelineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: pipelineId ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  <option value="">Selecione um funil</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de início</Label>
                  <FieldInput
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data de conclusão</Label>
                  <FieldInput
                    type="date"
                    value={conclusionDate}
                    onChange={(e) => setConclusionDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Escreva detalhes importantes sobre esse negócio"
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm resize-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: 'var(--ink-1)',
                  }}
                />
              </div>
            </div>
          </section>

          <div style={{ borderTop: '1px solid var(--edge)' }} />

          {/* Privacidade */}
          <section>
            <SectionTitle title="Privacidade" />
            <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>Quem pode ver o histórico e editar esse negócio?</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPrivacy('all')}
                className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors"
                style={{
                  border: `1px solid ${privacy === 'all' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
                  background: privacy === 'all' ? 'rgba(99,102,241,0.06)' : 'var(--surface)',
                }}
              >
                <span
                  className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    border: `2px solid ${privacy === 'all' ? 'var(--brand-500, #6366f1)' : 'var(--edge-strong, var(--edge))'}`,
                    background: privacy === 'all' ? 'var(--brand-500, #6366f1)' : 'transparent',
                  }}
                >
                  {privacy === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--ink-1)' }}>
                    <UsersIcon className="w-3.5 h-3.5" /> Todos
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    Todos os usuários da conta terão acesso.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('restricted')}
                className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors"
                style={{
                  border: `1px solid ${privacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
                  background: privacy === 'restricted' ? 'rgba(99,102,241,0.06)' : 'var(--surface)',
                }}
              >
                <span
                  className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    border: `2px solid ${privacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'var(--edge-strong, var(--edge))'}`,
                    background: privacy === 'restricted' ? 'var(--brand-500, #6366f1)' : 'transparent',
                  }}
                >
                  {privacy === 'restricted' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--ink-1)' }}>
                    <Lock className="w-3.5 h-3.5" /> Acesso restrito
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    O responsável, seus líderes e os administradores da conta sempre terão acesso. Você também pode conceder acesso a outros usuários.
                  </div>
                </div>
              </button>
            </div>

            {privacy === 'restricted' && (
              <div className="mt-4">
                <Label>Acessos adicionais</Label>
                <div
                  className="rounded-lg p-2 min-h-[42px] flex flex-wrap gap-1.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
                >
                  {additionalAccess.length === 0 && (
                    <span className="text-sm" style={{ color: 'var(--ink-3)' }}>Selecionar...</span>
                  )}
                  {additionalAccess.map((id) => {
                    const u = users.find((x) => x.id === id);
                    if (!u) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                        style={{ background: 'var(--surface-hover)', color: 'var(--ink-1)' }}
                      >
                        {u.name}
                        <button
                          type="button"
                          onClick={() => setAdditionalAccess((prev) => prev.filter((x) => x !== id))}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {users
                    .filter((u) => !additionalAccess.includes(u.id) && (!currentUser || u.id !== currentUser.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setAdditionalAccess((prev) => [...prev, u.id])}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-[var(--surface-hover)]"
                        style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
                      >
                        <Plus className="w-3 h-3" /> {u.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </section>

          <div style={{ borderTop: '1px solid var(--edge)' }} />

          {/* Produtos e serviços */}
          <section>
            <SectionTitle title="Produtos e serviços" />
            <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>
              Adicione produtos ou serviços com valor e quantidade na sua oportunidade de venda.
            </p>

            {products.length > 0 && (
              <div className="space-y-2 mb-3">
                {products.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-3 grid gap-2"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--edge)',
                      gridTemplateColumns: '2fr 1fr 80px 1fr 32px',
                    }}
                  >
                    <ProductNameField
                      productName={p.productName}
                      onUpdate={(patch) => updateProduct(idx, patch)}
                    />
                    <input
                      type="number"
                      placeholder="Valor unit."
                      value={p.unitPrice}
                      onChange={(e) => updateProduct(idx, { unitPrice: e.target.value })}
                      className="px-2 py-1.5 rounded-md outline-none text-sm"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                    />
                    <input
                      type="number"
                      placeholder="Qtd."
                      value={p.quantity}
                      onChange={(e) => updateProduct(idx, { quantity: e.target.value })}
                      className="px-2 py-1.5 rounded-md outline-none text-sm"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Desc."
                        value={p.discount}
                        onChange={(e) => updateProduct(idx, { discount: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-md outline-none text-sm"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                      />
                      <select
                        value={p.discountType}
                        onChange={(e) => updateProduct(idx, { discountType: e.target.value as 'value' | 'percent' })}
                        className="px-1 py-1.5 rounded-md outline-none text-xs"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                      >
                        <option value="value">R$</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(idx)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500"
                      style={{ color: 'var(--ink-3)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end text-xs" style={{ color: 'var(--ink-3)' }}>
                  Total produtos: <span className="ml-2 font-semibold" style={{ color: 'var(--ink-1)' }}>{formatBRL(productsTotal)}</span>
                </div>
              </div>
            )}

            <ProductPickerCombo
              onPick={(patch) =>
                setProducts((prev) => [...prev, { ...emptyProductDraft(), ...patch }])
              }
            />
          </section>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pb-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
