import { useRef, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, Plus, X, Building2, Star, Pencil, Camera, Trash2, Columns3,
} from 'lucide-react';
import {
  listCompanies, createCompany, updateCompany, deleteCompany,
  uploadCompanyAvatar, removeCompanyAvatar,
} from '@/api/companies';
import { listUsers } from '@/api/users';
import { listContacts } from '@/api/contacts';
import { useAuthStore } from '@/store/auth.store';
import type { Company, CompanyPrivacy, User } from '@/types/api';
import Avatar from '@/components/ui/Avatar';
import {
  ResizableDataList,
  ViewEditorModal,
  useColumnPrefs,
  type ColumnDef,
} from '@/components/data-list';

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

function Select({ value, onChange, options, placeholder }: {
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

/* ── Brazilian states ────────────────────────────────── */

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT',
  'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO',
  'RR', 'SC', 'SP', 'SE', 'TO',
];

const CATEGORIAS = ['Cliente', 'Prospect', 'Parceiro', 'Fornecedor', 'Lead'];
const ORIGENS = ['Site', 'Indicação', 'Redes sociais', 'E-mail', 'Evento', 'Outro'];
const SETORES = [
  'Tecnologia', 'Varejo', 'Serviços', 'Indústria', 'Saúde', 'Educação',
  'Financeiro', 'Imobiliário', 'Construção', 'Outro',
];

/* ── Add Company Modal ───────────────────────────────── */

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  company?: Company | null;
}

function AddCompanyModal({ open, onClose, currentUser, users, company }: AddCompanyModalProps) {
  const qc = useQueryClient();
  const isEdit = !!company;

  const emptyForm = () => ({
    name: '',
    cnpj: '',
    razaoSocial: '',
    categoria: '',
    origem: '',
    setor: '',
    descricao: '',
    responsibleId: currentUser?.id ?? '',
    privacy: 'all' as CompanyPrivacy,
    additionalAccessUserIds: [] as string[],
    email: '',
    whatsapp: '',
    telefone: '',
    website: '',
    cep: '',
    pais: 'Brasil',
    estado: '',
    cidade: '',
    bairro: '',
    rua: '',
    numero: '',
    complemento: '',
    produtos: [] as string[],
    pessoaIds: [] as string[],
    facebook: '',
    twitter: '',
    linkedin: '',
    skype: '',
    instagram: '',
    ranking: 0,
  });

  const formFromCompany = (c: Company) => ({
    ...emptyForm(),
    name: c.name ?? '',
    cnpj: c.cnpj ?? '',
    razaoSocial: c.razaoSocial ?? '',
    categoria: c.categoria ?? '',
    origem: c.origem ?? '',
    setor: c.setor ?? '',
    descricao: c.descricao ?? '',
    responsibleId: c.responsibleId ?? currentUser?.id ?? '',
    privacy: (c.privacy ?? 'all') as CompanyPrivacy,
    additionalAccessUserIds: c.additionalAccessUserIds ?? [],
    email: c.email ?? '',
    whatsapp: c.whatsapp ?? '',
    telefone: c.telefone ?? '',
    website: c.website ?? '',
    cep: c.cep ?? '',
    pais: c.pais ?? 'Brasil',
    estado: c.estado ?? '',
    cidade: c.cidade ?? '',
    bairro: c.bairro ?? '',
    rua: c.rua ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    produtos: c.produtos ?? [],
    pessoaIds: c.pessoaIds ?? [],
    facebook: c.facebook ?? '',
    twitter: c.twitter ?? '',
    linkedin: c.linkedin ?? '',
    skype: c.skype ?? '',
    instagram: c.instagram ?? '',
    ranking: c.ranking ?? 0,
  });

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', peopleSearch],
    queryFn: () => listContacts(peopleSearch || undefined),
    enabled: open && peopleSearch.length > 0,
  });

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setError('');
      setPeopleSearch('');
      return;
    }
    setForm(company ? formFromCompany(company) : emptyForm());
    setError('');
    setPeopleSearch('');
  }, [open, company]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(form)) {
        if (typeof value === 'string' && value.trim() === '') continue;
        if (Array.isArray(value) && value.length === 0 && key !== 'additionalAccessUserIds') continue;
        cleaned[key] = value;
      }
      cleaned.ranking = form.ranking || undefined;
      return company ? updateCompany(company.id, cleaned) : createCompany(cleaned as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
    onError: (err: any) => {
      const backendMsg = err?.response?.data?.message;
      const detail = Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg;
      setError(detail || (isEdit ? 'Erro ao atualizar empresa.' : 'Erro ao criar empresa.'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  const togglePeople = (id: string) => {
    set('pessoaIds', form.pessoaIds.includes(id)
      ? form.pessoaIds.filter((p) => p !== id)
      : [...form.pessoaIds, id]);
  };

  const toggleAccessUser = (id: string) => {
    set('additionalAccessUserIds', form.additionalAccessUserIds.includes(id)
      ? form.additionalAccessUserIds.filter((p) => p !== id)
      : [...form.additionalAccessUserIds, id]);
  };

  if (!open) return null;

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
            {isEdit ? 'Editar empresa' : 'Adicionar nova empresa'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-2)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {isEdit && company && (
            <section>
              <SectionTitle title="Logo" subtitle="Imagem de até 5MB (JPG, PNG ou WebP)." />
              <CompanyAvatarEditor company={company} />
            </section>
          )}

          {/* ── Dados básicos ── */}
          <section>
            <SectionTitle title="Dados básicos" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label required>Nome</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Digite o nome" />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Razão social</Label>
                <Input value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} placeholder="Digite a razão social" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.categoria}
                  onChange={(v) => set('categoria', v)}
                  options={CATEGORIAS.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div>
                <Label>Origem</Label>
                <Select
                  value={form.origem}
                  onChange={(v) => set('origem', v)}
                  options={ORIGENS.map((o) => ({ value: o, label: o }))}
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
                <Label>Setor</Label>
                <Select
                  value={form.setor}
                  onChange={(v) => set('setor', v)}
                  options={SETORES.map((s) => ({ value: s, label: s }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  placeholder="Escreva detalhes importantes sobre esse cliente"
                />
              </div>
            </div>
          </section>

          {/* ── Privacidade ── */}
          <section>
            <SectionTitle title="Privacidade" subtitle="Quem pode ver o histórico e editar essa empresa?" />
            <div className="space-y-3">
              <label
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
                style={{
                  background: form.privacy === 'all' ? 'var(--surface-hover)' : 'var(--surface)',
                  border: `1px solid ${form.privacy === 'all' ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
                }}
              >
                <input
                  type="radio"
                  checked={form.privacy === 'all'}
                  onChange={() => set('privacy', 'all')}
                  className="mt-1"
                />
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
                <input
                  type="radio"
                  checked={form.privacy === 'restricted'}
                  onChange={() => set('privacy', 'restricted')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Acesso restrito</div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    O responsável, seus líderes e os administradores da conta sempre terão acesso.
                    Você também pode conceder acesso a outros usuários.
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

          {/* ── Contato ── */}
          <section>
            <SectionTitle
              title="Informações para contato"
              subtitle="Adicione informações que facilitem o contato com o cliente."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="exemplo@email.com" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+00 00 00000-0000" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(00) 0000-0000" />
              </div>
              <div className="md:col-span-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="www.exemplo.com.br" />
              </div>
            </div>
          </section>

          {/* ── Endereço ── */}
          <section>
            <SectionTitle title="Dados de endereço" subtitle="Adicione a localização do seu cliente." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" />
              </div>
              <div>
                <Label>País</Label>
                <Input value={form.pais} onChange={(e) => set('pais', e.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select
                  value={form.estado}
                  onChange={(v) => set('estado', v)}
                  options={BR_STATES.map((s) => ({ value: s, label: s }))}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                  placeholder={form.estado ? 'Nome da cidade' : 'Primeiro, selecione o estado'}
                  disabled={!form.estado}
                />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} placeholder="Bairro X" />
              </div>
              <div>
                <Label>Rua</Label>
                <Input value={form.rua} onChange={(e) => set('rua', e.target.value)} placeholder="Rua Y" />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="77" />
              </div>
              <div className="md:col-span-2">
                <Label>Complemento</Label>
                <Input value={form.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Sala 153, Bloco B" />
              </div>
            </div>
          </section>

          {/* ── Pessoas ── */}
          <section>
            <SectionTitle title="Pessoas da empresa" subtitle="Adicione seus contatos diretos de dentro da empresa." />
            <Input
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              placeholder="Buscar contato..."
            />
            {peopleSearch && contacts.length > 0 && (
              <div
                className="mt-2 rounded-lg max-h-40 overflow-y-auto"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
              >
                {contacts.slice(0, 10).map((c) => {
                  const sel = form.pessoaIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePeople(c.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-hover)] flex items-center gap-2"
                      style={{ color: 'var(--ink-1)' }}
                    >
                      <input type="checkbox" checked={sel} readOnly className="pointer-events-none" />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            {form.pessoaIds.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
                {form.pessoaIds.length} pessoa(s) vinculada(s)
              </div>
            )}
          </section>

          {/* ── Redes sociais ── */}
          <section>
            <SectionTitle title="Redes sociais" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Facebook</Label>
                <Input value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="facebook.com/empresa" />
              </div>
              <div>
                <Label>X (Twitter)</Label>
                <Input value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="x.com/empresa" />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/empresa" />
              </div>
              <div>
                <Label>Skype</Label>
                <Input value={form.skype} onChange={(e) => set('skype', e.target.value)} placeholder="skype-id" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@empresa" />
              </div>
            </div>
          </section>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        {/* Footer actions */}
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
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar empresa'}
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
        <Building2 className="w-12 h-12" style={{ color: 'var(--brand-500, #6366f1)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>
        Monte sua carteira de clientes
      </h3>
      <p className="text-sm mb-5 max-w-sm" style={{ color: 'var(--ink-3)' }}>
        Você ainda não cadastrou empresas, que tal começar adicionando agora mesmo!
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
        style={{ background: 'var(--brand-500, #6366f1)' }}
      >
        <Plus className="w-4 h-4" />
        Adicionar empresa
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

type SortCompanies = 'nome_asc' | 'nome_desc' | 'recente' | 'antigo';

export default function Companies() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewEditorOpen, setViewEditorOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filterSetor, setFilterSetor] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [sort, setSort] = useState<SortCompanies>('recente');
  const activeFilters = [filterSetor, filterResponsavel].filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', debouncedSearch],
    queryFn: () => listCompanies(debouncedSearch || undefined),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setDeleteTarget(null); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: () => Promise.all([...selectedIds].map((id) => deleteCompany(id))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setSelectedIds(new Set()); setBulkDeleteOpen(false); },
  });

  const filteredCompanies = useMemo(() => {
    let result = [...companies];
    if (filterSetor) result = result.filter(c => c.setor === filterSetor);
    if (filterResponsavel) result = result.filter(c => c.responsibleId === filterResponsavel);
    result.sort((a, b) => {
      if (sort === 'nome_asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sort === 'nome_desc') return b.name.localeCompare(a.name, 'pt-BR');
      if (sort === 'antigo') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [companies, filterSetor, filterResponsavel, sort]);

  const companiesColumns = useMemo<ColumnDef<Company>[]>(() => [
    {
      key: 'index',
      label: '#',
      defaultWidth: 56,
      minWidth: 40,
      render: (_row, idx) => (
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nome',
      defaultWidth: 260,
      required: true,
      render: (c) => (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={c.name} url={c.avatarUrl} size={28} />
          <span className="font-medium truncate">{c.name}</span>
        </div>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      defaultWidth: 160,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.categoria ?? '—'}</span>,
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      defaultWidth: 180,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.responsible?.name ?? '—'}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      defaultWidth: 220,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.email ?? '—'}</span>,
    },
    {
      key: 'telefone',
      label: 'Telefone',
      defaultWidth: 160,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.telefone ?? c.celular ?? '—'}</span>,
    },
    {
      key: 'ranking',
      label: 'Ranking',
      defaultWidth: 110,
      render: (c) => (
        <div className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
          {c.ranking ? (
            <>
              <Star className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} fill="#f59e0b" />
              {c.ranking}
            </>
          ) : '—'}
        </div>
      ),
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      defaultWidth: 170,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.cnpj ?? '—'}</span>,
    },
    {
      key: 'setor',
      label: 'Setor',
      defaultWidth: 150,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.setor ?? '—'}</span>,
    },
    {
      key: 'origem',
      label: 'Origem',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.origem ?? '—'}</span>,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      defaultWidth: 160,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.whatsapp ?? '—'}</span>,
    },
    {
      key: 'cidade',
      label: 'Cidade',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.cidade ?? '—'}</span>,
    },
    {
      key: 'estado',
      label: 'Estado',
      defaultWidth: 90,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.estado ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      label: 'Criada em',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (c) => (
        <span className="truncate block" style={{ color: 'var(--ink-2)' }}>
          {new Date(c.createdAt).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
  ], []);

  const cols = useColumnPrefs<Company>('companies', companiesColumns);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>Empresas</h1>

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
              placeholder="Buscar por nome, razão social, CNPJ ou descrição"
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
          <select value={sort} onChange={e => setSort(e.target.value as SortCompanies)}
            className="px-3 py-2 rounded-lg text-sm font-medium outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="recente">Mais recentes</option>
            <option value="antigo">Mais antigos</option>
            <option value="nome_asc">Nome A→Z</option>
            <option value="nome_desc">Nome Z→A</option>
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
            Adicionar empresa
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {filterOpen && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
          <select value={filterSetor} onChange={e => setFilterSetor(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Setor</option>
            {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Responsável</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setFilterSetor(''); setFilterResponsavel(''); }}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              Limpar filtros
            </button>
          )}
          <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>
            {filteredCompanies.length} de {companies.length} registros
          </span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--brand-50,#eef2ff)', border: '1px solid var(--brand-200,#c7d2fe)' }}>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded hover:bg-black/5" title="Cancelar seleção">
            <X className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
          </button>
          <span style={{ color: 'var(--ink-2)' }}>{selectedIds.size} {selectedIds.size === 1 ? 'empresa selecionada' : 'empresas selecionadas'}</span>
          <button onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--danger)', color: '#fff' }}>
            <Trash2 className="w-3.5 h-3.5" />
            Deletar selecionados
          </button>
        </div>
      )}

      <ResizableDataList<Company>
        rows={filteredCompanies}
        rowKey={(c) => c.id}
        columns={cols.visibleColumns}
        widths={cols.prefs.widths}
        onWidthChange={cols.setWidth}
        loading={isLoading}
        onRowClick={(c) => setEditingCompany(c)}
        emptyState={<EmptyState onAdd={() => setAddOpen(true)} />}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        trailing={(c) => (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setEditingCompany(c); }}
              className="p-1.5 rounded-md hover:bg-[var(--edge)]" style={{ color: 'var(--ink-3)' }} title="Editar empresa">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
              className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--ink-3)' }} title="Deletar empresa">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        trailingWidth={72}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Deletar "{deleteTarget.name}"?</p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}>Cancelar</button>
              <button onClick={() => deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--danger)' }}>
                {deleteMut.isPending ? 'Deletando…' : 'Deletar'}
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
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Deletar {selectedIds.size} {selectedIds.size === 1 ? 'empresa' : 'empresas'}?</p>
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

      <AddCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentUser={user}
        users={users}
      />
      <AddCompanyModal
        open={!!editingCompany}
        onClose={() => setEditingCompany(null)}
        currentUser={user}
        users={users}
        company={editingCompany}
      />

      <ViewEditorModal<Company>
        open={viewEditorOpen}
        onClose={() => setViewEditorOpen(false)}
        title="Visualização de empresas"
        columns={companiesColumns}
        order={cols.prefs.order}
        hidden={cols.prefs.hidden}
        onApply={({ order, hidden }) => {
          cols.setOrder(order);
          cols.setVisible(companiesColumns.map((c) => c.key).filter((k) => !hidden.includes(k)));
        }}
        onReset={cols.reset}
      />
    </div>
  );
}

/* ── Avatar editor ───────────────────────────────────── */

function CompanyAvatarEditor({ company }: { company: Company }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const patchLists = (updated: Company) => {
    const patch = (old: Company[] | undefined) =>
      old?.map((c) => (c.id === updated.id ? { ...c, avatarUrl: updated.avatarUrl } : c)) ?? old;
    qc.setQueriesData<Company[]>({ queryKey: ['companies'] }, patch);
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadCompanyAvatar(company.id, file),
    onSuccess: (updated) => {
      patchLists(updated);
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onSettled: () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
      setPreview(null);
    },
  });
  const removeMut = useMutation({
    mutationFn: () => removeCompanyAvatar(company.id),
    onSuccess: (updated) => {
      patchLists(updated);
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return;
    const blob = URL.createObjectURL(f);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = blob;
    setPreview(blob);
    uploadMut.mutate(f);
    e.target.value = '';
  };

  const displayUrl = preview ?? company.avatarUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={company.name} url={displayUrl} size={72} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMut.isPending}
          className="absolute -bottom-1 -right-1 p-1.5 rounded-full"
          style={{ background: 'var(--brand-500)', color: '#fff' }}
          aria-label="Alterar logo"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      {company.avatarUrl && (
        <button
          type="button"
          onClick={() => removeMut.mutate()}
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Remover logo
        </button>
      )}
    </div>
  );
}
