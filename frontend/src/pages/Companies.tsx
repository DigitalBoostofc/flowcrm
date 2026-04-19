import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ArrowUpDown, Columns3, Download, Upload, Plus, X, Building2, Star,
} from 'lucide-react';
import { listCompanies, createCompany } from '@/api/companies';
import { listUsers } from '@/api/users';
import { listContacts } from '@/api/contacts';
import { useAuthStore } from '@/store/auth.store';
import type { Company, CompanyPrivacy, User } from '@/types/api';

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
}

function AddCompanyModal({ open, onClose, currentUser, users }: AddCompanyModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
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
    celular: '',
    fax: '',
    ramal: '',
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
  }));
  const [error, setError] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [productInput, setProductInput] = useState('');

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', peopleSearch],
    queryFn: () => listContacts(peopleSearch || undefined),
    enabled: open && peopleSearch.length > 0,
  });

  useEffect(() => {
    if (!open) {
      setError('');
      setPeopleSearch('');
      setProductInput('');
    }
  }, [open]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => createCompany({
      ...form,
      ranking: form.ranking || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
    onError: () => setError('Erro ao criar empresa.'),
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

  const addProduct = () => {
    const v = productInput.trim();
    if (!v) return;
    set('produtos', [...form.produtos, v]);
    setProductInput('');
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
            Adicionar nova empresa
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
              <div>
                <Label>Celular</Label>
                <Input value={form.celular} onChange={(e) => set('celular', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Fax</Label>
                <Input value={form.fax} onChange={(e) => set('fax', e.target.value)} placeholder="(00) 0000-0000" />
              </div>
              <div>
                <Label>Ramal</Label>
                <Input value={form.ramal} onChange={(e) => set('ramal', e.target.value)} placeholder="00" />
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

          {/* ── Produtos ── */}
          <section>
            <SectionTitle title="Produtos e serviços" subtitle="Quais esta empresa tem potencial de compra?" />
            <Label>Produtos</Label>
            <div className="flex gap-2">
              <Input
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addProduct(); }
                }}
                placeholder="Buscar..."
              />
              <button
                type="button"
                onClick={addProduct}
                className="px-3 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
              >
                Adicionar
              </button>
            </div>
            {form.produtos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.produtos.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{ background: '#1f2937', color: '#fff' }}
                  >
                    {p}
                    <button type="button" onClick={() => set('produtos', form.produtos.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
            {mutation.isPending ? 'Salvando...' : 'Salvar empresa'}
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

export default function Companies() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', debouncedSearch],
    queryFn: () => listCompanies(debouncedSearch || undefined),
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="page-title">Empresas</h1>

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
            Adicionar empresa
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        <div
          className="grid grid-cols-6 gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ borderBottom: '1px solid var(--edge)', color: 'var(--ink-2)' }}
        >
          <div>Nome</div>
          <div>Categoria</div>
          <div>Responsável</div>
          <div>Email</div>
          <div>Telefone</div>
          <div>Ranking</div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>
            Carregando...
          </div>
        ) : companies.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <div>
            {companies.map((c: Company) => (
              <div
                key={c.id}
                className="grid grid-cols-6 gap-4 px-6 py-3 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderBottom: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              >
                <div className="font-medium truncate">{c.name}</div>
                <div className="truncate" style={{ color: 'var(--ink-2)' }}>{c.categoria ?? '—'}</div>
                <div className="truncate" style={{ color: 'var(--ink-2)' }}>{c.responsible?.name ?? '—'}</div>
                <div className="truncate" style={{ color: 'var(--ink-2)' }}>{c.email ?? '—'}</div>
                <div className="truncate" style={{ color: 'var(--ink-2)' }}>{c.telefone ?? c.celular ?? '—'}</div>
                <div className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                  {c.ranking ? (
                    <>
                      <Star className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} fill="#f59e0b" />
                      {c.ranking}
                    </>
                  ) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentUser={user}
        users={users}
      />
    </div>
  );
}
