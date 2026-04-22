import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, Columns3, Plus,
  List, GitBranch, Star, Pencil, Trash2,
  ChevronDown, Briefcase, Building2, X, Settings as SettingsIcon, Lock, Users as UsersIcon,
} from 'lucide-react';
import { listAllLeads, createLead, updateLead, updateLeadStatus, moveLead, deleteLead } from '@/api/leads';
import type { LeadItemInput } from '@/api/leads';
import { listPipelines } from '@/api/pipelines';
import { listContacts, createContact } from '@/api/contacts';
import { listCompanies } from '@/api/companies';
import { listUsers } from '@/api/users';
import { listProducts, createProduct, type Product, type ProductInput } from '@/api/products';
import ProductFormModal from '@/components/products/ProductFormModal';
import { useAuthStore } from '@/store/auth.store';
import type { Company, Contact, Lead, LeadStatus, Pipeline, User } from '@/types/api';
import NegocioDetailPanel from '@/components/negocios/NegocioDetailPanel';
import Avatar from '@/components/ui/Avatar';
import {
  ResizableDataList,
  ViewEditorModal,
  useColumnPrefs,
  type ColumnDef,
} from '@/components/data-list';

/* ── Formatters ──────────────────────────────────────── */

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_META: Record<LeadStatus, { label: string; fg: string; bg: string; dot: string }> = {
  active:  { label: 'Em andamento', fg: '#a16207', bg: '#fef3c7',   dot: '#f59e0b' },
  won:     { label: 'Ganho',        fg: '#166534', bg: '#dcfce7',   dot: '#22c55e' },
  lost:    { label: 'Perdido',      fg: '#991b1b', bg: '#fee2e2',   dot: '#ef4444' },
  frozen:  { label: 'Congelado',    fg: '#075985', bg: '#e0f2fe',   dot: '#0ea5e9' },
};

/* ── Status dropdown ─────────────────────────────────── */

function StatusCell({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(lead.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      setOpen(false);
    },
  });

  const meta = STATUS_META[lead.status];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-90"
        style={{ background: meta.bg, color: meta.fg }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
        {meta.label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-20 min-w-[160px] py-1"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
          >
            {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => {
              const m = STATUS_META[s];
              return (
                <button
                  key={s}
                  onClick={() => mut.mutate(s)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--ink-1)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Stage dropdown ──────────────────────────────────── */

function StageCell({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (stageId: string) => moveLead(lead.id, stageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      setOpen(false);
    },
  });

  const stages = lead.pipeline?.stages ?? [];
  const position = lead.stage?.position ?? 0;
  const label = lead.stage ? `${position + 1}. ${lead.stage.name}` : '—';

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
        style={{ color: 'var(--ink-1)', border: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && stages.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-20 min-w-[200px] py-1 max-h-64 overflow-y-auto"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
          >
            {stages
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => mut.mutate(s.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition-colors text-left"
                  style={{
                    color: s.id === lead.stageId ? 'var(--brand-500, #6366f1)' : 'var(--ink-1)',
                    fontWeight: s.id === lead.stageId ? 600 : 400,
                  }}
                >
                  {s.position + 1}. {s.name}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Ranking stars ───────────────────────────────────── */

function RankingCell({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const current = lead.ranking ?? 0;
  const [hover, setHover] = useState<number | null>(null);

  const mut = useMutation({
    mutationFn: (ranking: number) => updateLead(lead.id, { ranking }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['negocios'] }),
  });

  const display = hover ?? current;

  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onMouseEnter={() => setHover(i)}
          onClick={() => mut.mutate(i === current ? 0 : i)}
          className="p-0.5 transition-transform hover:scale-110"
          title={`${i} estrela${i > 1 ? 's' : ''}`}
        >
          <Star
            className="w-4 h-4"
            style={{
              color: i <= display ? '#f59e0b' : 'var(--ink-3)',
              fill: i <= display ? '#f59e0b' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Row actions ─────────────────────────────────────── */

function RowActions({ lead, onDelete }: { lead: Lead; onDelete: (l: Lead) => void }) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
      <button
        className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
        style={{ color: 'var(--ink-2)' }}
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
        className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-500"
        style={{ color: 'var(--ink-2)' }}
        title="Excluir"
      >
        <Trash2 className="w-4 h-4" />
      </button>
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
        <Briefcase className="w-12 h-12" style={{ color: 'var(--brand-500, #6366f1)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
        Nenhum negócio cadastrado
      </h3>
      <p className="text-sm mb-5 max-w-sm" style={{ color: 'var(--ink-3)' }}>
        Comece cadastrando um novo negócio para acompanhar sua evolução no funil.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
        style={{ background: 'var(--brand-500, #6366f1)' }}
      >
        <Plus className="w-4 h-4" />
        Adicionar negócio
      </button>
    </div>
  );
}

/* ── AddNegocioModal ─────────────────────────────────── */

type Privacy = 'all' | 'restricted';

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink-1)' }}>{title}</h3>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center justify-between text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
      <span>{children}</span>
      {required && <span className="text-[10px] italic font-normal" style={{ color: 'var(--ink-3)' }}>Obrigatório</span>}
    </label>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg outline-none text-sm focus:border-[var(--brand-500)] disabled:opacity-60"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        color: 'var(--ink-1)',
      }}
    />
  );
}

function ContactAutocomplete({
  value, onChange, selectedCompany, onCompanyChange, label,
}: {
  value: Contact | null;
  onChange: (c: Contact | null) => void;
  selectedCompany: Company | null;
  onCompanyChange: (c: Company | null) => void;
  label?: string;
}) {
  const displayName = value?.name ?? selectedCompany?.name ?? '';
  const [query, setQuery] = useState(displayName);
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.name ?? selectedCompany?.name ?? '');
  }, [value, selectedCompany]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const { data: contactResults = [] } = useQuery({
    queryKey: ['contacts-autocomplete', debounced],
    queryFn: () => listContacts(debounced || undefined),
    enabled: true,
    staleTime: 0,
  });

  const { data: companyResults = [] } = useQuery({
    queryKey: ['companies-autocomplete', debounced],
    queryFn: () => listCompanies(debounced || undefined),
    enabled: true,
    staleTime: 0,
  });

  const handlePickCompany = (co: Company) => {
    onCompanyChange(co);
    onChange(null);
    setQuery(co.name);
    setOpen(false);
  };

  const hasResults = contactResults.length > 0 || companyResults.length > 0;

  return (
    <div className="relative" ref={ref}>
      <FieldInput
        placeholder={label ?? 'Digite o nome do cliente ou empresa'}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
          if (selectedCompany) onCompanyChange(null);
          setOpen(true);
        }}
      />
      {(value || selectedCompany) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); onCompanyChange(null); setQuery(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--ink-3)' }}
          title="Limpar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && hasResults && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto py-1"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        >
          {companyResults.length > 0 && (
            <>
              <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                Empresas
              </div>
              {companyResults.slice(0, 10).map((co) => (
                <button
                  key={`co-${co.id}`}
                  type="button"
                  onClick={() => handlePickCompany(co)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] text-left disabled:opacity-50"
                  style={{ color: 'var(--ink-1)' }}
                >
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface-hover)', color: 'var(--brand-500, #6366f1)' }}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate">{co.name}</div>
                    {co.setor && (
                      <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{co.setor}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
          {contactResults.length > 0 && (
            <>
              {companyResults.length > 0 && (
                <div className="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                  Pessoas
                </div>
              )}
              {contactResults.slice(0, 20).map((c) => (
                <button
                  key={`ct-${c.id}`}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    onCompanyChange(null);
                    setQuery(c.name);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] text-left"
                  style={{ color: 'var(--ink-1)' }}
                >
                  <Avatar name={c.name} url={c.avatarUrl} size={24} />
                  <div className="min-w-0">
                    <div className="truncate">{c.name}</div>
                    {c.company && (
                      <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{c.company}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type ProductDraft = {
  productName: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  discountType: 'value' | 'percent';
};

function emptyProductDraft(): ProductDraft {
  return { productName: '', unitPrice: '', quantity: '1', discount: '0', discountType: 'value' };
}

function ProductPickerCombo({
  onPick,
}: {
  onPick: (patch: { productName: string; unitPrice?: string }) => void;
}) {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data = [] } = useQuery({
    queryKey: ['products', { onlyActive: true }],
    queryFn: () => listProducts({ onlyActive: true }),
  });

  const createMut = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onPick({
        productName: p.name,
        ...(p.price != null ? { unitPrice: String(Number(p.price)) } : {}),
      });
      setAddOpen(false);
      setFormError(null);
      setOpen(false);
      setQuery('');
    },
    onError: (e: any) => setFormError(e?.response?.data?.message ?? 'Erro ao salvar'),
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? data.filter((p) => p.name.toLowerCase().includes(q)) : data).slice(0, 30),
    [data, q],
  );
  const exact = useMemo(
    () => (q ? data.find((p) => p.name.toLowerCase() === q) ?? null : null),
    [data, q],
  );

  const pick = (p: Product) => {
    onPick({
      productName: p.name,
      ...(p.price != null ? { unitPrice: String(Number(p.price)) } : {}),
    });
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          placeholder="Buscar produto ou serviço"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          className="w-full pl-3 pr-9 py-2 rounded-lg outline-none text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--ink-3)' }}
          aria-label="Abrir lista"
        >
          <ChevronDown className="w-4 h-4" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
        </button>
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        >
          <div
            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest sticky top-0"
            style={{ color: 'var(--ink-3)', background: 'var(--surface)' }}
          >
            Cadastrados em configurações
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-3 text-xs" style={{ color: 'var(--ink-3)' }}>
              {q ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-1)' }}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--ink-3)' }}>
                {p.price != null
                  ? Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : p.type === 'servico'
                  ? 'Serviço'
                  : 'Produto'}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setFormError(null); setAddOpen(true); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-[var(--surface-hover)] font-medium sticky bottom-0"
            style={{
              color: 'var(--brand-500, #6366f1)',
              borderTop: '1px solid var(--edge)',
              background: 'var(--surface-raised)',
            }}
          >
            <Plus className="w-4 h-4" />
            {q && !exact ? `Cadastrar novo: "${query.trim()}"` : 'Cadastrar novo produto e serviço'}
          </button>
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

function ProductNameField({
  productName,
  onUpdate,
}: {
  productName: string;
  onUpdate: (patch: Partial<ProductDraft>) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data = [] } = useQuery({
    queryKey: ['products', { onlyActive: true }],
    queryFn: () => listProducts({ onlyActive: true }),
  });

  const createMut = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onUpdate({
        productName: p.name,
        ...(p.price != null ? { unitPrice: String(Number(p.price)) } : {}),
      });
      setAddOpen(false);
      setFormError(null);
      setOpen(false);
    },
    onError: (e: any) => setFormError(e?.response?.data?.message ?? 'Erro ao salvar'),
  });

  const q = productName.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? data.filter((p) => p.name.toLowerCase().includes(q)) : data).slice(0, 20),
    [data, q],
  );
  const exact = useMemo(
    () => (q ? data.find((p) => p.name.toLowerCase() === q) ?? null : null),
    [data, q],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (p: Product) => {
    onUpdate({
      productName: p.name,
      ...(p.price != null ? { unitPrice: String(Number(p.price)) } : {}),
    });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          placeholder="Selecione ou digite para buscar"
          value={productName}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onUpdate({ productName: e.target.value });
            setOpen(true);
          }}
          className="w-full pl-2 pr-8 py-1.5 rounded-md outline-none text-sm"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--ink-3)' }}
          aria-label="Abrir lista de produtos"
        >
          <ChevronDown className="w-4 h-4" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
        </button>
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-lg shadow-lg max-h-72 overflow-y-auto"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        >
          <div
            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--ink-3)', background: 'var(--surface)' }}
          >
            Cadastrados em configurações
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-3 text-xs" style={{ color: 'var(--ink-3)' }}>
              {q ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-1)' }}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--ink-3)' }}>
                {p.price != null
                  ? Number(p.price).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  : p.type === 'servico'
                  ? 'Serviço'
                  : 'Produto'}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setAddOpen(true);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-[var(--surface-hover)] font-medium"
            style={{
              color: 'var(--brand-500, #6366f1)',
              borderTop: '1px solid var(--edge)',
            }}
          >
            <Plus className="w-4 h-4" />
            {q && !exact ? `Criar novo: "${productName.trim()}"` : 'Cadastrar novo produto/serviço'}
          </button>
        </div>
      )}
      {addOpen && (
        <ProductFormModal
          initialName={productName.trim() || undefined}
          onClose={() => setAddOpen(false)}
          onSubmit={(input) => createMut.mutateAsync(input)}
          pending={createMut.isPending}
          error={formError}
        />
      )}
    </div>
  );
}

export function AddNegocioModal({
  open, onClose, pipelines, users, currentUser, initialPipelineId, initialStageId,
}: {
  open: boolean;
  onClose: () => void;
  pipelines: Pipeline[];
  users: User[];
  currentUser: User | null;
  initialPipelineId?: string | null;
  initialStageId?: string | null;
}) {
  const qc = useQueryClient();

  const defaultPipeline = useMemo(
    () => pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null,
    [pipelines],
  );

  const { data: workspaceData } = useQuery({ queryKey: ['workspace-me'], queryFn: () => import('@/api/workspace').then(m => m.getMyWorkspace()) });

  const [contact, setContact] = useState<Contact | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [title, setTitle] = useState('');
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [value, setValue] = useState('');
  const [pipelineId, setPipelineId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [conclusionDate, setConclusionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('all');
  const [additionalAccess, setAdditionalAccess] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setContact(null);
    setSelectedCompany(null);
    setTitle('');
    setResponsibleId(currentUser?.id ?? '');
    setValue('');
    setPipelineId(initialPipelineId || defaultPipeline?.id || '');
    setStartDate('');
    setConclusionDate('');
    setNotes('');
    setPrivacy(workspaceData?.defaultLeadPrivacy ?? 'all');
    setAdditionalAccess([]);
    setProducts([]);
    setError('');
  }, [open, currentUser, defaultPipeline, initialPipelineId]);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId) ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contact && !selectedCompany) throw new Error('contact');
      if (!title.trim()) throw new Error('title');
      if (!selectedPipeline) throw new Error('pipeline');
      const sortedStages = (selectedPipeline.stages ?? []).slice().sort((a, b) => a.position - b.position);
      const targetStage = (initialStageId && sortedStages.find((s) => s.id === initialStageId)) || sortedStages[0];
      if (!targetStage) throw new Error('stage');

      const items: LeadItemInput[] = products
        .filter((p) => p.productName.trim())
        .map((p) => ({
          productName: p.productName.trim(),
          unitPrice: Number(p.unitPrice) || 0,
          quantity: Number(p.quantity) || 1,
          discount: Number(p.discount) || 0,
          discountType: p.discountType,
        }));

      return createLead({
        contactId: contact?.id,
        companyId: selectedCompany?.id,
        pipelineId: selectedPipeline.id,
        stageId: targetStage.id,
        title: title.trim(),
        value: value ? Number(value) : undefined,
        assignedToId: responsibleId || undefined,
        startDate: startDate || undefined,
        conclusionDate: conclusionDate || undefined,
        notes: notes.trim() || undefined,
        privacy,
        additionalAccessUserIds: privacy === 'restricted' ? additionalAccess : [],
        items: items.length ? items : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['negocios'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      onClose();
    },
    onError: (err: any) => {
      const code = err?.message;
      if (code === 'contact') setError('Selecione uma empresa ou pessoa.');
      else if (code === 'title') setError('Informe o nome do negócio.');
      else if (code === 'pipeline') setError('Selecione um funil.');
      else if (code === 'stage') setError('O funil selecionado não possui etapas.');
      else setError('Erro ao criar negócio.');
    },
  });

  const submit = () => {
    setError('');
    mutation.mutate();
  };

  if (!open) return null;

  const updateProduct = (idx: number, patch: Partial<ProductDraft>) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removeProduct = (idx: number) => setProducts((prev) => prev.filter((_, i) => i !== idx));

  const productTotal = (p: ProductDraft) => {
    const subtotal = (Number(p.unitPrice) || 0) * (Number(p.quantity) || 0);
    const disc = Number(p.discount) || 0;
    return p.discountType === 'percent' ? subtotal * (1 - disc / 100) : subtotal - disc;
  };

  const productsTotal = products.reduce((s, p) => s + productTotal(p), 0);

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
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)' }}>Adicionar novo negócio</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: 'var(--brand-500, #6366f1)', background: 'var(--surface-hover)' }}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Personalize este formulário
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-3)' }}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="px-6 py-5 space-y-8">
          {/* Dados básicos */}
          <section>
            <SectionTitle title="Dados básicos" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label required>Empresa / Pessoa</Label>
                <ContactAutocomplete
                  value={contact}
                  onChange={setContact}
                  selectedCompany={selectedCompany}
                  onCompanyChange={setSelectedCompany}
                />
              </div>
              <div>
                <Label required>Nome do negócio</Label>
                <FieldInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Proposta comercial"
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <select
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--edge)',
                    color: responsibleId ? 'var(--ink-1)' : 'var(--ink-3)',
                  }}
                >
                  <option value="">Selecione um responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === currentUser?.id ? `Eu (${u.name})` : u.name}
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
                    placeholder="00/00/0000"
                  />
                </div>
                <div>
                  <Label>Data de conclusão</Label>
                  <FieldInput
                    type="date"
                    value={conclusionDate}
                    onChange={(e) => setConclusionDate(e.target.value)}
                    placeholder="00/00/0000"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Escreva detalhes importantes sobre esse cliente"
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
                    .filter((u) => !additionalAccess.includes(u.id) && u.id !== currentUser?.id)
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
                setProducts((prev) => [
                  ...prev,
                  { ...emptyProductDraft(), ...patch },
                ])
              }
            />
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
            style={{ color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

type SortNegocios = 'recente' | 'antigo' | 'valor_asc' | 'valor_desc';

export default function Negocios() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPipelineFilter = searchParams.get('pipeline') ?? '';
  const initialStatusFilter   = searchParams.get('status') ?? '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(Boolean(initialPipelineFilter || initialStatusFilter));
  const [viewEditorOpen, setViewEditorOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState(initialStatusFilter);
  const [filterPipeline, setFilterPipeline] = useState(initialPipelineFilter);
  const [filterAssignee, setFilterAssignee] = useState('');

  // Remove query params assim que capturados
  useEffect(() => {
    if (searchParams.get('pipeline') || searchParams.get('status')) {
      const next = new URLSearchParams(searchParams);
      next.delete('pipeline');
      next.delete('status');
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sort, setSort] = useState<SortNegocios>('recente');
  const activeFilters = [filterStatus, filterPipeline, filterAssignee].filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['negocios'],
    queryFn: listAllLeads,
  });

  const bulkDeleteMut = useMutation({
    mutationFn: () => Promise.all([...selectedIds].map((id) => deleteLead(id))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['negocios'] }); setSelectedIds(new Set()); setBulkDeleteOpen(false); },
  });

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  // Attach pipeline.stages so StageCell dropdown has options
  const leadsWithPipelineStages = useMemo(() => {
    const byId = new Map(pipelines.map((p) => [p.id, p]));
    return leads.map((l) => {
      const pipe = l.pipeline ?? byId.get(l.pipelineId);
      const fullPipe = pipe && pipe.stages ? pipe : byId.get(l.pipelineId) ?? pipe;
      return { ...l, pipeline: fullPipe };
    });
  }, [leads, pipelines]);

  const filteredLeads = useMemo(() => {
    let result = debouncedSearch
      ? leadsWithPipelineStages.filter((l) => {
          const text = [l.title, l.contact?.name, l.contact?.company, l.contact?.email, l.createdBy?.name, l.assignedTo?.name, l.stage?.name]
            .filter(Boolean).join(' ').toLowerCase();
          return text.includes(debouncedSearch);
        })
      : leadsWithPipelineStages;

    if (filterStatus) result = result.filter(l => l.status === filterStatus);
    if (filterPipeline) result = result.filter(l => l.pipelineId === filterPipeline);
    if (filterAssignee) result = result.filter(l => l.assignedToId === filterAssignee);

    result = [...result].sort((a, b) => {
      if (sort === 'valor_asc') return Number(a.value ?? 0) - Number(b.value ?? 0);
      if (sort === 'valor_desc') return Number(b.value ?? 0) - Number(a.value ?? 0);
      if (sort === 'antigo') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [leadsWithPipelineStages, debouncedSearch, filterStatus, filterPipeline, filterAssignee, sort]);

  const total = filteredLeads.length;
  const totalValue = useMemo(
    () => filteredLeads.reduce((sum, l) => sum + Number(l.value ?? 0), 0),
    [filteredLeads],
  );

  const negociosColumns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      key: 'title',
      label: 'Nome',
      defaultWidth: 240,
      required: true,
      render: (lead) => (
        <span className="font-medium truncate block">
          {lead.title ?? lead.contact?.name ?? 'Sem título'}
        </span>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      defaultWidth: 160,
      render: (lead) => (
        <span className="truncate block" style={{ color: lead.contact?.categoria ? 'var(--ink-2)' : 'var(--ink-3)' }}>
          {lead.contact?.categoria ?? '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Telefone',
      defaultWidth: 160,
      render: (lead) => {
        const phone = lead.contact?.phone ?? lead.externalPhone ?? '';
        return (
          <span className="truncate block" style={{ color: phone ? 'var(--ink-2)' : 'var(--ink-3)' }}>
            {phone || '—'}
          </span>
        );
      },
    },
    {
      key: 'email',
      label: 'E-mail',
      defaultWidth: 220,
      render: (lead) => (
        <span className="truncate block" style={{ color: lead.contact?.email ? 'var(--ink-2)' : 'var(--ink-3)' }}>
          {lead.contact?.email ?? '—'}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Responsável',
      defaultWidth: 100,
      minWidth: 72,
      render: (lead) => {
        const assignedTo = lead.assignedTo ?? (lead.assignedToId ? userById.get(lead.assignedToId) : null);
        return assignedTo ? (
          <div className="flex items-center justify-start" title={assignedTo.name}>
            <Avatar name={assignedTo.name} url={assignedTo.avatarUrl} size={26} />
          </div>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        );
      },
    },
    {
      key: 'index',
      label: '#',
      defaultWidth: 56,
      minWidth: 40,
      hiddenByDefault: true,
      render: (_row, idx) => (
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'contact',
      label: 'Contato',
      defaultWidth: 220,
      hiddenByDefault: true,
      render: (lead) => {
        const contact = lead.contact;
        return contact ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={contact.name} url={contact.avatarUrl} size={26} />
            <span className="truncate" style={{ color: 'var(--ink-2)' }}>{contact.name}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        );
      },
    },
    {
      key: 'createdBy',
      label: 'Cadastrado por',
      defaultWidth: 180,
      hiddenByDefault: true,
      render: (lead) => {
        const createdBy = lead.createdBy ?? (lead.createdById ? userById.get(lead.createdById) : null);
        return createdBy ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={createdBy.name} url={createdBy.avatarUrl} size={24} />
            <span className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{createdBy.name}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      defaultWidth: 160,
      hiddenByDefault: true,
      render: (lead) => <StatusCell lead={lead} />,
    },
    {
      key: 'stage',
      label: 'Etapa',
      defaultWidth: 200,
      hiddenByDefault: true,
      render: (lead) => <StageCell lead={lead} />,
    },
    {
      key: 'value',
      label: 'Valor',
      defaultWidth: 140,
      align: 'right',
      getNumericValue: (lead) => lead.value ? Number(lead.value) : null,
      formatAggregate: formatBRL,
      render: (lead) => (
        <span className="truncate block" style={{ color: lead.value ? 'var(--ink-1)' : 'var(--ink-3)' }}>
          {lead.value ? formatBRL(Number(lead.value)) : 'Indefinido'}
        </span>
      ),
    },
    {
      key: 'ranking',
      label: 'Ranking',
      defaultWidth: 150,
      hiddenByDefault: true,
      render: (lead) => <RankingCell lead={lead} />,
    },
    {
      key: 'pipeline',
      label: 'Funil',
      defaultWidth: 160,
      hiddenByDefault: true,
      render: (lead) => (
        <span className="truncate block" style={{ color: 'var(--ink-2)' }}>
          {lead.pipeline?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Criado em',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (lead) => (
        <span className="truncate block" style={{ color: 'var(--ink-2)' }}>
          {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
  ], [userById]);

  const cols = useColumnPrefs<Lead>('negocios', negociosColumns);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
            Negócios
          </h1>
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {formatBRL(totalValue)}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--surface-hover)',
              color: 'var(--ink-2)',
              border: '1px solid var(--edge)',
            }}
          >
            {total}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
          >
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: 'var(--brand-500, #6366f1)', color: '#fff' }}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => navigate('/funil')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--ink-2)' }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Funil
            </button>
          </div>

        </div>
      </div>

      {/* Toolbar */}
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
              placeholder="Buscar por nome do negócio, contato ou empresa"
              className="w-full pl-9 pr-3 py-2 rounded-lg outline-none text-sm"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
              }}
            />
          </div>

          <button
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: filterOpen || activeFilters > 0 ? 'var(--brand-50)' : 'var(--surface)',
              border: `1px solid ${activeFilters > 0 ? 'var(--brand-500)' : 'var(--edge)'}`,
              color: activeFilters > 0 ? 'var(--brand-500)' : 'var(--ink-1)',
            }}
          >
            <Filter className="w-4 h-4" />
            Filtros{activeFilters > 0 && ` (${activeFilters})`}
          </button>
          <select value={sort} onChange={e => setSort(e.target.value as SortNegocios)}
            className="px-3 py-2 rounded-lg text-sm font-medium outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="recente">Mais recentes</option>
            <option value="antigo">Mais antigos</option>
            <option value="valor_desc">Maior valor</option>
            <option value="valor_asc">Menor valor</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewEditorOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            title="Editar visualização"
          >
            <Columns3 className="w-4 h-4" />
            Visualização
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            <Plus className="w-4 h-4" />
            Adicionar negócio
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {filterOpen && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Status</option>
            <option value="active">Em andamento</option>
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
            <option value="frozen">Congelado</option>
          </select>
          <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Funil</option>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Responsável</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setFilterStatus(''); setFilterPipeline(''); setFilterAssignee(''); }}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              Limpar filtros
            </button>
          )}
          <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>
            {filteredLeads.length} de {leads.length} registros
          </span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--brand-50,#eef2ff)', border: '1px solid var(--brand-200,#c7d2fe)' }}>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded hover:bg-black/5" title="Cancelar seleção">
            <X className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
          </button>
          <span style={{ color: 'var(--ink-2)' }}>{selectedIds.size} {selectedIds.size === 1 ? 'negócio selecionado' : 'negócios selecionados'}</span>
          <button onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--danger)', color: '#fff' }}>
            <Trash2 className="w-3.5 h-3.5" />
            Deletar selecionados
          </button>
        </div>
      )}

      <ResizableDataList<Lead>
        rows={filteredLeads}
        rowKey={(l) => l.id}
        columns={cols.visibleColumns}
        widths={cols.prefs.widths}
        onWidthChange={cols.setWidth}
        loading={isLoading}
        onRowClick={(l) => setSelectedLeadId(l.id)}
        emptyState={<EmptyState onAdd={() => setAddOpen(true)} />}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        trailing={(lead) => <RowActions lead={lead} onDelete={setDeleteTarget} />}
        trailingWidth={72}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              Deletar "{deleteTarget.title ?? deleteTarget.contact?.name ?? deleteTarget.company?.name ?? 'sem título'}"?
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}>Cancelar</button>
              <button
                onClick={() => { deleteLead(deleteTarget.id).then(() => { qc.invalidateQueries({ queryKey: ['negocios'] }); setDeleteTarget(null); }); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--danger)' }}>
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setBulkDeleteOpen(false)}>
          <div className="w-full max-w-sm rounded-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Deletar {selectedIds.size} {selectedIds.size === 1 ? 'negócio' : 'negócios'}?</p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBulkDeleteOpen(false)} className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}>Cancelar</button>
              <button onClick={() => bulkDeleteMut.mutate()} disabled={bulkDeleteMut.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--danger)' }}>
                {bulkDeleteMut.isPending ? 'Deletando…' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end text-xs" style={{ color: 'var(--ink-3)' }}>
        Exibindo {total} de {total} negócio{total !== 1 ? 's' : ''}
      </div>

      <AddNegocioModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        pipelines={pipelines}
        users={users}
        currentUser={currentUser}
      />
      {selectedLeadId && (() => {
        const sel = leadsWithPipelineStages.find((l) => l.id === selectedLeadId);
        if (!sel) return null;
        return (
          <NegocioDetailPanel
            lead={sel}
            currentUser={currentUser}
            users={users}
            pipelines={pipelines}
            onClose={() => setSelectedLeadId(null)}
          />
        );
      })()}

      <ViewEditorModal<Lead>
        open={viewEditorOpen}
        onClose={() => setViewEditorOpen(false)}
        title="Visualização de negócios"
        columns={negociosColumns}
        order={cols.prefs.order}
        hidden={cols.prefs.hidden}
        onApply={({ order, hidden }) => {
          cols.setOrder(order);
          cols.setVisible(negociosColumns.map((c) => c.key).filter((k) => !hidden.includes(k)));
        }}
        onReset={cols.reset}
      />
    </div>
  );
}
