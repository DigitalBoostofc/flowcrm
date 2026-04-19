import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ArrowUpDown, Columns3, Download, Upload, Plus, X, Users,
} from 'lucide-react';
import { listContacts, createContact } from '@/api/contacts';
import { listUsers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import type { Contact, ContactPrivacy, User } from '@/types/api';
import PessoaDetailPanel from '@/components/pessoas/PessoaDetailPanel';

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
      className="w-full px-3 py-2 rounded-lg outline-none text-sm focus:border-[var(--brand-500)] disabled:opacity-60"
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

/* ── Constants ───────────────────────────────────────── */

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT',
  'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO',
  'RR', 'SC', 'SP', 'SE', 'TO',
];

const CATEGORIAS = ['Cliente', 'Prospect', 'Parceiro', 'Fornecedor', 'Lead'];
const ORIGENS = ['Site', 'Indicação', 'Redes sociais', 'E-mail', 'Evento', 'Outro'];

/* ── AddPessoaModal ──────────────────────────────────── */

function AddPessoaModal({
  open, onClose, currentUser, users,
}: {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
}) {
  const qc = useQueryClient();

  const emptyForm = () => ({
    name: '',
    cpf: '',
    company: '',
    role: '',
    birthDay: '',
    birthYear: '',
    responsibleId: currentUser?.id ?? '',
    categoria: '',
    origem: '',
    descricao: '',
    privacy: 'all' as ContactPrivacy,
    additionalAccessUserIds: [] as string[],
    email: '',
    whatsapp: '',
    phone: '',
    celular: '',
    fax: '',
    ramal: '',
    zipCode: '',
    pais: 'Brasil',
    estado: '',
    cidade: '',
    bairro: '',
    rua: '',
    numero: '',
    complemento: '',
    produtos: [] as string[],
    facebook: '',
    twitter: '',
    linkedin: '',
    skype: '',
    instagram: '',
  });

  const [form, setForm] = useState(emptyForm);
  const [productInput, setProductInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setProductInput('');
      setError('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleAccessUser = (id: string) => {
    set(
      'additionalAccessUserIds',
      form.additionalAccessUserIds.includes(id)
        ? form.additionalAccessUserIds.filter((x) => x !== id)
        : [...form.additionalAccessUserIds, id],
    );
  };

  const addProduct = () => {
    const v = productInput.trim();
    if (!v) return;
    set('produtos', [...form.produtos, v]);
    setProductInput('');
  };

  const mutation = useMutation({
    mutationFn: () =>
      createContact({
        name: form.name.trim(),
        cpf: form.cpf.trim() || undefined,
        company: form.company.trim() || undefined,
        role: form.role.trim() || undefined,
        birthDay: form.birthDay.trim() || undefined,
        birthYear: form.birthYear ? parseInt(form.birthYear, 10) : undefined,
        responsibleId: form.responsibleId || undefined,
        categoria: form.categoria || undefined,
        origem: form.origem || undefined,
        descricao: form.descricao.trim() || undefined,
        privacy: form.privacy,
        additionalAccessUserIds: form.privacy === 'restricted' ? form.additionalAccessUserIds : [],
        email: form.email.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        phone: form.phone.trim() || undefined,
        celular: form.celular.trim() || undefined,
        fax: form.fax.trim() || undefined,
        ramal: form.ramal.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        pais: form.pais.trim() || undefined,
        estado: form.estado || undefined,
        cidade: form.cidade.trim() || undefined,
        bairro: form.bairro.trim() || undefined,
        rua: form.rua.trim() || undefined,
        numero: form.numero.trim() || undefined,
        complemento: form.complemento.trim() || undefined,
        produtos: form.produtos.length ? form.produtos : undefined,
        facebook: form.facebook.trim() || undefined,
        twitter: form.twitter.trim() || undefined,
        linkedin: form.linkedin.trim() || undefined,
        skype: form.skype.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    },
    onError: () => setError('Erro ao criar pessoa.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Por favor, informe o nome da pessoa.');
      return;
    }
    setError('');
    mutation.mutate();
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
            Adicionar nova pessoa
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
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Digite o nome"
                />
                {error && error.toLowerCase().includes('nome') && (
                  <p className="text-xs mt-1 text-red-500">{error}</p>
                )}
              </div>

              <div>
                <Label>CPF</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => set('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  placeholder="Digite o nome da empresa"
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  placeholder="Digite o cargo"
                />
              </div>
              <div>
                <Label>Aniversário</Label>
                <Input
                  value={form.birthDay}
                  onChange={(e) => set('birthDay', e.target.value)}
                  placeholder="00/00"
                  maxLength={5}
                />
              </div>
              <div>
                <Label>Ano nasc.</Label>
                <Input
                  type="number"
                  value={form.birthYear}
                  onChange={(e) => set('birthYear', e.target.value)}
                  placeholder="0000"
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
                />
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
            <SectionTitle title="Privacidade" subtitle="Quem pode ver o histórico e editar essa pessoa?" />
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
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(00) 0000-0000" />
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
            </div>
          </section>

          {/* ── Endereço ── */}
          <section>
            <SectionTitle title="Dados de endereço" subtitle="Adicione a localização do seu cliente." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <Input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} placeholder="00000-000" />
              </div>
              <div>
                <Label>País</Label>
                <Input value={form.pais} onChange={(e) => set('pais', e.target.value)} placeholder="Brasil" />
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
            <SectionTitle title="Produtos e serviços" subtitle="Quais esta pessoa tem potencial de compra?" />
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

          {/* ── Redes sociais ── */}
          <section>
            <SectionTitle title="Redes sociais" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Facebook</Label>
                <Input value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="facebook.com/agendor" />
              </div>
              <div>
                <Label>X (Twitter)</Label>
                <Input value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="x.com/agendor" />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/agendor" />
              </div>
              <div>
                <Label>Skype</Label>
                <Input value={form.skype} onChange={(e) => set('skype', e.target.value)} placeholder="agendorcrm" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@agendor" />
              </div>
            </div>
          </section>

          {error && !error.toLowerCase().includes('nome') && (
            <p className="text-xs text-red-500">{error}</p>
          )}
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
            {mutation.isPending ? 'Salvando...' : 'Salvar pessoa'}
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
        Você ainda não cadastrou pessoas. Que tal começar adicionando agora mesmo!
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState<Contact | null>(null);

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
      <h1 className="page-title">Pessoas</h1>

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
                  onClick={() => setSelectedPessoa(c)}
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

      <AddPessoaModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentUser={user}
        users={users}
      />

      {selectedPessoa && (
        <PessoaDetailPanel
          contact={selectedPessoa}
          currentUser={user}
          users={users}
          onClose={() => setSelectedPessoa(null)}
        />
      )}
    </div>
  );
}
