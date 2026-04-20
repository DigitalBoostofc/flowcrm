import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Package, X } from 'lucide-react';
import type {
  Product,
  ProductAppliesTo,
  ProductClientType,
  ProductInput,
  ProductType,
} from '@/api/products';
import { listContacts } from '@/api/contacts';
import { listCompanies } from '@/api/companies';
import Avatar from '@/components/ui/Avatar';

interface Props {
  initial?: Product | null;
  initialName?: string;
  lockAppliesTo?: ProductAppliesTo;
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<unknown> | void;
  pending?: boolean;
  error?: string | null;
}

type SelectedClient = {
  id: string;
  type: Exclude<ProductClientType, null>;
  name: string;
};

export default function ProductFormModal({
  initial,
  initialName,
  onClose,
  onSubmit,
  pending = false,
  error,
}: Props) {
  const [name, setName] = useState(initial?.name ?? initialName ?? '');
  const [type, setType] = useState<ProductType>(initial?.type ?? 'produto');
  const [priceText, setPriceText] = useState<string>(
    initial?.price != null ? String(Number(initial.price)).replace('.', ',') : '',
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  const [client, setClient] = useState<SelectedClient | null>(
    initial?.clientId && initial?.clientType
      ? {
          id: initial.clientId,
          type: initial.clientType,
          name: initial.clientName ?? '',
        }
      : null,
  );
  const [clientQuery, setClientQuery] = useState<string>(initial?.clientName ?? '');
  const [clientOpen, setClientOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  const clientWrapRef = useRef<HTMLDivElement>(null);
  const productNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(clientQuery.trim()), 200);
    return () => clearTimeout(id);
  }, [clientQuery]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (clientWrapRef.current && !clientWrapRef.current.contains(e.target as Node)) {
        setClientOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const { data: companyResults = [] } = useQuery({
    queryKey: ['product-client-companies', debouncedQuery],
    queryFn: () => listCompanies(debouncedQuery || undefined),
    staleTime: 10_000,
  });

  const { data: contactResults = [] } = useQuery({
    queryKey: ['product-client-contacts', debouncedQuery],
    queryFn: () => listContacts(debouncedQuery || undefined),
    staleTime: 10_000,
  });

  const hasResults = companyResults.length > 0 || contactResults.length > 0;

  const parsePrice = (txt: string): number | null => {
    const t = txt.replace(/\./g, '').replace(',', '.').trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const appliesTo = useMemo<ProductAppliesTo>(() => {
    if (client?.type === 'company') return 'empresa';
    if (client?.type === 'contact') return 'pessoa';
    return 'ambos';
  }, [client]);

  const canSave = name.trim().length > 0 && !pending;

  const handleSubmit = async () => {
    if (!canSave) return;
    const price = parsePrice(priceText);
    await onSubmit({
      name: name.trim(),
      type,
      appliesTo,
      price,
      active,
      clientId: client?.id ?? null,
      clientType: client?.type ?? null,
      clientName: client?.name ?? null,
    });
  };

  const pickCompany = (co: { id: string; name: string }) => {
    setClient({ id: co.id, type: 'company', name: co.name });
    setClientQuery(co.name);
    setClientOpen(false);
    setTimeout(() => productNameRef.current?.focus(), 0);
  };

  const pickContact = (c: { id: string; name: string }) => {
    setClient({ id: c.id, type: 'contact', name: c.name });
    setClientQuery(c.name);
    setClientOpen(false);
    setTimeout(() => productNameRef.current?.focus(), 0);
  };

  const clearClient = () => {
    setClient(null);
    setClientQuery('');
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
            <Package className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--ink-1)' }}>
            {initial ? 'Editar produto/serviço' : 'Novo produto/serviço'}
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--ink-3)' }}>
            Vincule a um cliente e defina o nome do item.
          </p>

          <div className="w-full space-y-4 text-left">
            <Field label="Cliente">
              <div className="relative" ref={clientWrapRef}>
                <input
                  value={clientQuery}
                  onFocus={() => setClientOpen(true)}
                  onChange={(e) => {
                    setClientQuery(e.target.value);
                    if (client) setClient(null);
                    setClientOpen(true);
                  }}
                  placeholder="Busque uma empresa ou pessoa..."
                  className="w-full px-3 py-2.5 pr-8 rounded-lg outline-none text-sm"
                  style={inputStyle}
                />
                {client && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearClient();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-3)' }}
                    title="Limpar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {clientOpen && hasResults && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto py-1"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--edge)',
                    }}
                  >
                    {companyResults.length > 0 && (
                      <>
                        <div
                          className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          Empresas
                        </div>
                        {companyResults.slice(0, 10).map((co) => (
                          <button
                            key={`co-${co.id}`}
                            type="button"
                            onClick={() => pickCompany(co)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] text-left"
                            style={{ color: 'var(--ink-1)' }}
                          >
                            <span
                              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                background: 'var(--surface-hover)',
                                color: 'var(--brand-500, #6366f1)',
                              }}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate">{co.name}</div>
                              {co.setor && (
                                <div
                                  className="text-xs truncate"
                                  style={{ color: 'var(--ink-3)' }}
                                >
                                  {co.setor}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {contactResults.length > 0 && (
                      <>
                        <div
                          className="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          Pessoas
                        </div>
                        {contactResults.slice(0, 20).map((c) => (
                          <button
                            key={`ct-${c.id}`}
                            type="button"
                            onClick={() => pickContact(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] text-left"
                            style={{ color: 'var(--ink-1)' }}
                          >
                            <Avatar name={c.name} url={c.avatarUrl} size={24} />
                            <div className="min-w-0">
                              <div className="truncate">{c.name}</div>
                              {c.company && (
                                <div
                                  className="text-xs truncate"
                                  style={{ color: 'var(--ink-3)' }}
                                >
                                  {c.company}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              {client && (
                <div
                  className="mt-1.5 text-xs flex items-center gap-1.5"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {client.type === 'company' ? (
                    <Building2 className="w-3 h-3" />
                  ) : (
                    <span>•</span>
                  )}
                  {client.type === 'company' ? 'Empresa' : 'Pessoa'} selecionada
                </div>
              )}
            </Field>

            <Field label="Nome do produto/serviço">
              <input
                ref={productNameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Consultoria, Plano Pro..."
                className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
                style={inputStyle}
              />
            </Field>

            <Field label="Tipo">
              <div className="flex gap-2">
                <SegBtn active={type === 'produto'} onClick={() => setType('produto')}>
                  Produto
                </SegBtn>
                <SegBtn active={type === 'servico'} onClick={() => setType('servico')}>
                  Serviço
                </SegBtn>
              </div>
            </Field>

            <Field label="Preço (opcional)">
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: 'var(--ink-2)',
                  }}
                >
                  R$
                </span>
                <input
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="flex-1 px-3 py-2.5 rounded-lg outline-none text-sm"
                  style={inputStyle}
                />
              </div>
            </Field>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--brand-500)]"
              />
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Ativo
              </span>
            </label>

            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}
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
              onClick={handleSubmit}
              disabled={!canSave}
              className="px-6 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              {pending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--edge)',
  color: 'var(--ink-1)',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: 'var(--ink-3)' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SegBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: active ? 'var(--brand-500, #6366f1)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--ink-2)',
        border: active ? '1px solid var(--brand-500, #6366f1)' : '1px solid var(--edge)',
      }}
    >
      {children}
    </button>
  );
}
