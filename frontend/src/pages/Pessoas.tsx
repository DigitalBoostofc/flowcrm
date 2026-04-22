import { useRef, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, Plus, X, Users, Pencil, Camera, Trash2, Columns3, Loader2,
} from 'lucide-react';
import {
  listContacts, createContact, updateContact, deleteContact,
  uploadContactAvatar, removeContactAvatar,
} from '@/api/contacts';
import { listUsers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import type { Contact, ContactPrivacy, User } from '@/types/api';
import PessoaDetailPanel from '@/components/pessoas/PessoaDetailPanel';
import Avatar from '@/components/ui/Avatar';
import {
  ResizableDataList,
  ViewEditorModal,
  useColumnPrefs,
  type ColumnDef,
} from '@/components/data-list';
import { maskCep, fetchViaCep } from '@/lib/cep';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
  open, onClose, currentUser, users, contact,
}: {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  contact?: Contact | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!contact;

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

  const formFromContact = (c: Contact) => ({
    ...emptyForm(),
    name: c.name ?? '',
    cpf: c.cpf ?? '',
    company: c.company ?? '',
    role: c.role ?? '',
    birthDay: c.birthDay ?? '',
    birthYear: c.birthYear ? String(c.birthYear) : '',
    responsibleId: c.responsibleId ?? currentUser?.id ?? '',
    categoria: c.categoria ?? '',
    origem: c.origem ?? '',
    descricao: c.descricao ?? '',
    privacy: (c.privacy ?? 'all') as ContactPrivacy,
    additionalAccessUserIds: c.additionalAccessUserIds ?? [],
    email: c.email ?? '',
    whatsapp: c.whatsapp ?? '',
    phone: c.phone ?? '',
    zipCode: c.zipCode ?? '',
    pais: c.pais ?? 'Brasil',
    estado: c.estado ?? '',
    cidade: c.cidade ?? '',
    bairro: c.bairro ?? '',
    rua: c.rua ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    produtos: c.produtos ?? [],
    facebook: c.facebook ?? '',
    twitter: c.twitter ?? '',
    linkedin: c.linkedin ?? '',
    skype: c.skype ?? '',
    instagram: c.instagram ?? '',
  });

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const lastLookedUpCep = useRef('');
  const cepAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      cepAbortRef.current?.abort();
      cepAbortRef.current = null;
      lastLookedUpCep.current = '';
      setForm(emptyForm());
      setError('');
      return;
    }
    setForm(contact ? formFromContact(contact) : emptyForm());
    setError('');
  }, [open, contact]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const lookupCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    if (lastLookedUpCep.current === digits) return;
    lastLookedUpCep.current = digits;

    cepAbortRef.current?.abort();
    const controller = new AbortController();
    cepAbortRef.current = controller;

    setCepLoading(true);
    setCepError('');
    try {
      const data = await fetchViaCep(digits, controller.signal);
      if (!data) {
        lastLookedUpCep.current = '';
        setCepError('CEP não encontrado');
        return;
      }
      setForm((f) => ({
        ...f,
        estado: data.uf || f.estado,
        cidade: data.localidade || f.cidade,
        bairro: data.bairro || f.bairro,
        rua: data.logradouro || f.rua,
        complemento: data.complemento || f.complemento,
        pais: f.pais || 'Brasil',
      }));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setCepError('Falha ao buscar CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const toggleAccessUser = (id: string) => {
    set(
      'additionalAccessUserIds',
      form.additionalAccessUserIds.includes(id)
        ? form.additionalAccessUserIds.filter((x) => x !== id)
        : [...form.additionalAccessUserIds, id],
    );
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
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
      };
      return contact ? updateContact(contact.id, payload) : createContact(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    },
    onError: () => setError(isEdit ? 'Erro ao atualizar pessoa.' : 'Erro ao criar pessoa.'),
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
            {isEdit ? 'Editar pessoa' : 'Adicionar nova pessoa'}
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
          {isEdit && contact && (
            <section>
              <SectionTitle title="Foto" subtitle="Imagem de até 5MB (JPG, PNG ou WebP)." />
              <PessoaAvatarEditor contact={contact} />
            </section>
          )}

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
            </div>
          </section>

          {/* ── Endereço ── */}
          <section>
            <SectionTitle title="Dados de endereço" subtitle="Adicione a localização do seu cliente." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <div className="relative">
                  <Input
                    value={form.zipCode}
                    onChange={(e) => {
                      const masked = maskCep(e.target.value);
                      set('zipCode', masked);
                      if (masked.replace(/\D/g, '').length === 8) lookupCep(masked);
                      else {
                        lastLookedUpCep.current = '';
                        setCepError('');
                      }
                    }}
                    onBlur={(e) => lookupCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                      style={{ color: 'var(--ink-3)' }}
                    />
                  )}
                </div>
                {cepError && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger, #dc2626)' }}>{cepError}</p>
                )}
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
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar pessoa'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Avatar editor (edição) ──────────────────────────── */

function PessoaAvatarEditor({ contact }: { contact: Contact }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const patchLists = (updated: Contact) => {
    const patch = (old: Contact[] | undefined) =>
      old?.map((c) => (c.id === updated.id ? { ...c, avatarUrl: updated.avatarUrl } : c)) ?? old;
    qc.setQueriesData<Contact[]>({ queryKey: ['pessoas'] }, patch);
    qc.setQueriesData<Contact[]>({ queryKey: ['contacts'] }, patch);
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadContactAvatar(contact.id, file),
    onSuccess: (updated) => {
      patchLists(updated);
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
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
    mutationFn: () => removeContactAvatar(contact.id),
    onSuccess: (updated) => {
      patchLists(updated);
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
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

  const displayUrl = preview ?? contact.avatarUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={contact.name} url={displayUrl} size={72} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMut.isPending}
          className="absolute -bottom-1 -right-1 p-1.5 rounded-full"
          style={{ background: 'var(--brand-500)', color: '#fff' }}
          aria-label="Alterar foto"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      {contact.avatarUrl && (
        <button
          type="button"
          onClick={() => removeMut.mutate()}
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Remover foto
        </button>
      )}
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

type SortPessoas = 'nome_asc' | 'nome_desc' | 'recente' | 'antigo';

export default function Pessoas() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewEditorOpen, setViewEditorOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState<Contact | null>(null);
  const [editingPessoa, setEditingPessoa] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Filtros
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [sort, setSort] = useState<SortPessoas>('recente');

  const activeFilters = [filterCategoria, filterOrigem, filterResponsavel].filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['pessoas', debouncedSearch],
    queryFn: () => listContacts(debouncedSearch || undefined),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      setDeleteTarget(null);
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: () => Promise.all([...selectedIds].map((id) => deleteContact(id))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
  });

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const filteredContacts = useMemo(() => {
    let result = [...contacts];
    if (filterCategoria) result = result.filter(c => c.categoria === filterCategoria);
    if (filterOrigem) result = result.filter(c => c.origem === filterOrigem);
    if (filterResponsavel) result = result.filter(c => c.responsibleId === filterResponsavel);
    result.sort((a, b) => {
      if (sort === 'nome_asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sort === 'nome_desc') return b.name.localeCompare(a.name, 'pt-BR');
      if (sort === 'antigo') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [contacts, filterCategoria, filterOrigem, filterResponsavel, sort]);

  const total = filteredContacts.length;

  const pessoasColumns = useMemo<ColumnDef<Contact>[]>(() => [
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
      key: 'company',
      label: 'Empresa',
      defaultWidth: 180,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.company ?? '—'}</span>,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      defaultWidth: 140,
      render: (c) => (
        <span className="truncate block" style={{ color: 'var(--ink-2)' }}>
          {c.categoria ? (
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
            >
              {c.categoria}
            </span>
          ) : '—'}
        </span>
      ),
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      defaultWidth: 200,
      render: (c) => {
        const responsavel = c.responsibleId ? userById.get(c.responsibleId) : null;
        return responsavel ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={responsavel.name} url={responsavel.avatarUrl} size={26} />
            <span className="truncate" style={{ color: 'var(--ink-2)' }}>{responsavel.name}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      defaultWidth: 220,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.email ?? '—'}</span>,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      defaultWidth: 160,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.whatsapp ?? '—'}</span>,
    },
    {
      key: 'phone',
      label: 'Telefone',
      defaultWidth: 160,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.phone ?? '—'}</span>,
    },
    {
      key: 'role',
      label: 'Cargo',
      defaultWidth: 160,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.role ?? '—'}</span>,
    },
    {
      key: 'cpf',
      label: 'CPF',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.cpf ?? '—'}</span>,
    },
    {
      key: 'origem',
      label: 'Origem',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (c) => <span className="truncate block" style={{ color: 'var(--ink-2)' }}>{c.origem ?? '—'}</span>,
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
      label: 'Criado em',
      defaultWidth: 140,
      hiddenByDefault: true,
      render: (c) => (
        <span className="truncate block" style={{ color: 'var(--ink-2)' }}>
          {new Date(c.createdAt).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'negociosValor',
      label: 'Negócios (R$)',
      defaultWidth: 150,
      hiddenByDefault: true,
      align: 'right',
      getNumericValue: (c) => {
        if (!c.leads?.length) return null;
        const sum = c.leads.reduce((acc, l) => acc + Number(l.value ?? 0), 0);
        return sum > 0 ? sum : null;
      },
      formatAggregate: formatBRL,
      render: (c) => {
        const sum = c.leads?.reduce((acc, l) => acc + Number(l.value ?? 0), 0) ?? 0;
        return (
          <span className="truncate block" style={{ color: sum > 0 ? 'var(--ink-1)' : 'var(--ink-3)' }}>
            {sum > 0 ? formatBRL(sum) : '—'}
          </span>
        );
      },
    },
  ], [userById]);

  const cols = useColumnPrefs<Contact>('pessoas', pessoasColumns);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>Pessoas</h1>

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
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortPessoas)}
            className="px-3 py-2 rounded-lg text-sm font-medium outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
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
            Adicionar
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {filterOpen && (
        <div
          className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
        >
          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Categoria</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterOrigem} onChange={e => setFilterOrigem(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Origem</option>
            {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterResponsavel} onChange={e => setFilterResponsavel(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}>
            <option value="">Responsável</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setFilterCategoria(''); setFilterOrigem(''); setFilterResponsavel(''); }}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              Limpar filtros
            </button>
          )}
          <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>
            {filteredContacts.length} de {contacts.length} registros
          </span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--brand-50,#eef2ff)', border: '1px solid var(--brand-200,#c7d2fe)' }}>
          <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded hover:bg-black/5" title="Cancelar seleção">
            <X className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
          </button>
          <span style={{ color: 'var(--ink-2)' }}>{selectedIds.size} {selectedIds.size === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Deletar selecionados
          </button>
        </div>
      )}

      <ResizableDataList<Contact>
        rows={filteredContacts}
        rowKey={(c) => c.id}
        columns={cols.visibleColumns}
        widths={cols.prefs.widths}
        onWidthChange={cols.setWidth}
        loading={isLoading}
        onRowClick={(c) => setSelectedPessoa(c)}
        emptyState={<EmptyState onAdd={() => setAddOpen(true)} />}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        trailing={(c) => (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingPessoa(c); }}
              className="p-1.5 rounded-md hover:bg-[var(--edge)]"
              style={{ color: 'var(--ink-3)' }}
              title="Editar pessoa"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
              className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500"
              style={{ color: 'var(--ink-3)' }}
              title="Deletar pessoa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        trailingWidth={72}
      />

      {/* Confirm delete individual */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              Deletar "{deleteTarget.name}"?
            </p>
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

      {/* Confirm bulk delete */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setBulkDeleteOpen(false)}>
          <div className="w-full max-w-sm rounded-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
              Deletar {selectedIds.size} {selectedIds.size === 1 ? 'pessoa' : 'pessoas'}?
            </p>
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
        Exibindo {total} de {total} pessoa{total !== 1 ? 's' : ''}
      </div>

      <AddPessoaModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentUser={user}
        users={users}
      />

      <AddPessoaModal
        open={!!editingPessoa}
        onClose={() => setEditingPessoa(null)}
        currentUser={user}
        users={users}
        contact={editingPessoa}
      />

      {selectedPessoa && (
        <PessoaDetailPanel
          contact={selectedPessoa}
          currentUser={user}
          users={users}
          onClose={() => setSelectedPessoa(null)}
          onEdit={() => { setEditingPessoa(selectedPessoa); setSelectedPessoa(null); }}
        />
      )}

      <ViewEditorModal<Contact>
        open={viewEditorOpen}
        onClose={() => setViewEditorOpen(false)}
        title="Visualização de pessoas"
        columns={pessoasColumns}
        order={cols.prefs.order}
        hidden={cols.prefs.hidden}
        onApply={({ order, hidden }) => {
          cols.setOrder(order);
          cols.setVisible(pessoasColumns.map((c) => c.key).filter((k) => !hidden.includes(k)));
        }}
        onReset={cols.reset}
      />
    </div>
  );
}
