import { useEffect, useRef, useState } from 'react';
import { Package, X } from 'lucide-react';
import type {
  Product,
  ProductAppliesTo,
  ProductInput,
  ProductType,
} from '@/api/products';

interface Props {
  initial?: Product | null;
  initialName?: string;
  lockAppliesTo?: ProductAppliesTo;
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<unknown> | void;
  pending?: boolean;
  error?: string | null;
}

export default function ProductFormModal({
  initial,
  initialName,
  lockAppliesTo,
  onClose,
  onSubmit,
  pending = false,
  error,
}: Props) {
  const [name, setName] = useState(initial?.name ?? initialName ?? '');
  const [type, setType] = useState<ProductType>(initial?.type ?? 'produto');
  const [appliesTo, setAppliesTo] = useState<ProductAppliesTo>(
    lockAppliesTo ?? initial?.appliesTo ?? 'ambos',
  );
  const [priceText, setPriceText] = useState<string>(
    initial?.price != null ? String(Number(initial.price)).replace('.', ',') : '',
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const parsePrice = (txt: string): number | null => {
    const t = txt.replace(/\./g, '').replace(',', '.').trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

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
    });
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
            Defina tipo, aplicabilidade e preço (opcional).
          </p>

          <div className="w-full space-y-4 text-left">
            <Field label="Nome">
              <input
                ref={nameRef}
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

            <Field label="Aplicável a">
              <div className="flex gap-2">
                <SegBtn
                  active={appliesTo === 'pessoa'}
                  onClick={() => !lockAppliesTo && setAppliesTo('pessoa')}
                  disabled={!!lockAppliesTo && lockAppliesTo !== 'pessoa' && lockAppliesTo !== 'ambos'}
                >
                  Pessoa
                </SegBtn>
                <SegBtn
                  active={appliesTo === 'empresa'}
                  onClick={() => !lockAppliesTo && setAppliesTo('empresa')}
                  disabled={!!lockAppliesTo && lockAppliesTo !== 'empresa' && lockAppliesTo !== 'ambos'}
                >
                  Empresa
                </SegBtn>
                <SegBtn
                  active={appliesTo === 'ambos'}
                  onClick={() => !lockAppliesTo && setAppliesTo('ambos')}
                  disabled={!!lockAppliesTo}
                >
                  Ambos
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
