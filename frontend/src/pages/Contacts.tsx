import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Phone, Mail, User, ExternalLink, Upload, X,
  Plus, ChevronDown, UserRound, Building2, Briefcase,
} from 'lucide-react';
import Papa from 'papaparse';
import { listContacts, createContact } from '@/api/contacts';
import { createLead } from '@/api/leads';
import { listPipelines } from '@/api/pipelines';
import { usePanelStore } from '@/store/panel.store';
import { api } from '@/api/client';
import Modal from '@/components/ui/Modal';
import type { Contact } from '@/types/api';

/* ── helpers ─────────────────────────────────────────── */

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-3)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="input-base" autoComplete="off" />;
}

/* ── Modal: Adicionar Pessoa ─────────────────────────── */

function AddPessoaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', phoneType: 'Celular', phone: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createContact({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      company: form.company.trim() || undefined,
      role: form.role.trim() || undefined,
    } as Parameters<typeof createContact>[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setForm({ name: '', company: '', role: '', email: '', phoneType: 'Celular', phone: '' });
      setError('');
      onClose();
    },
    onError: () => setError('Erro ao criar contato.'),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar uma Pessoa">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Field label="Nome" required>
          <TextInput value={form.name} onChange={set('name')} placeholder="Nome" />
        </Field>
        <Field label="Empresa">
          <TextInput value={form.company} onChange={set('company')} placeholder="Nome da empresa" />
        </Field>
        <Field label="Cargo">
          <TextInput value={form.role} onChange={set('role')} placeholder="Cargo" />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={form.email} onChange={set('email')} placeholder="exemplo@email.com" />
        </Field>
        <Field label="Tipo de telefone">
          <select value={form.phoneType} onChange={set('phoneType')} className="select-base w-full">
            <option>Celular</option>
            <option>Fixo</option>
            <option>WhatsApp</option>
          </select>
        </Field>
        <Field label="Telefone">
          <TextInput type="tel" value={form.phone} onChange={set('phone')} placeholder="(DDD) Número" />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ModalActions onClose={onClose} pending={mutation.isPending} />
      </form>
    </Modal>
  );
}

/* ── Modal: Adicionar Empresa ────────────────────────── */

function AddEmpresaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', website: '', zipCode: '', phone: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => createContact({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      zipCode: form.zipCode.trim() || undefined,
    } as Parameters<typeof createContact>[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setForm({ name: '', website: '', zipCode: '', phone: '' });
      setError('');
      onClose();
    },
    onError: () => setError('Erro ao criar empresa.'),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar uma Empresa">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Field label="Nome" required>
          <TextInput value={form.name} onChange={set('name')} placeholder="Empresa Y" />
        </Field>
        <Field label="Website">
          <TextInput type="url" value={form.website} onChange={set('website')} placeholder="www.empresa.com.br" />
        </Field>
        <Field label="CEP">
          <TextInput value={form.zipCode} onChange={set('zipCode')} placeholder="00000-000" maxLength={9} />
        </Field>
        <Field label="Telefone">
          <TextInput type="tel" value={form.phone} onChange={set('phone')} placeholder="(DDD) Número" />
        </Field>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ModalActions onClose={onClose} pending={mutation.isPending} />
      </form>
    </Modal>
  );
}

/* ── Modal: Adicionar Negócio ────────────────────────── */

function AddNegocioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', contactSearch: '', value: '', pipelineId: '', notes: '' });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [error, setError] = useState('');

  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines, enabled: open });
  const { data: contactResults = [] } = useQuery({
    queryKey: ['contacts', form.contactSearch],
    queryFn: () => import('@/api/contacts').then((m) => m.listContacts(form.contactSearch)),
    enabled: open && form.contactSearch.trim().length >= 2 && !selectedContact,
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const pipeline = pipelines.find((p) => p.id === form.pipelineId) ?? pipelines[0];
      if (!pipeline) throw new Error('Selecione um funil.');
      const stage = [...(pipeline.stages ?? [])].sort((a, b) => a.position - b.position)[0];
      if (!stage) throw new Error('Pipeline sem etapas.');

      let contactId = selectedContact?.id;
      if (!contactId) {
        const name = form.contactSearch.trim();
        if (!name) throw new Error('Informe o cliente.');
        const c = await createContact({ name });
        contactId = c.id;
      }

      return createLead({
        contactId,
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: form.title.trim() || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setForm({ title: '', contactSearch: '', value: '', pipelineId: '', notes: '' });
      setSelectedContact(null);
      setError('');
      onClose();
    },
    onError: (e: Error) => setError(e.message || 'Erro ao criar negócio.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactSearch.trim() && !selectedContact) { setError('Informe o cliente.'); return; }
    setError('');
    mutation.mutate();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Adicionar um Negócio">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Field label="Título">
          <TextInput value={form.title} onChange={set('title')} placeholder="Venda de produto Y" />
        </Field>

        <Field label="Empresa / Pessoa" required>
          {selectedContact ? (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              <span style={{ color: 'var(--ink-1)' }}>{selectedContact.name}</span>
              <button
                type="button"
                onClick={() => { setSelectedContact(null); setForm((f) => ({ ...f, contactSearch: '' })); }}
                style={{ color: 'var(--ink-3)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <TextInput
                value={form.contactSearch}
                onChange={set('contactSearch')}
                placeholder="Nome do cliente"
              />
              {contactResults.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                  style={{ background: 'var(--surface-overlay)', border: '1px solid var(--edge-strong)' }}
                >
                  {contactResults.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedContact(c); setForm((f) => ({ ...f, contactSearch: c.name })); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--ink-1)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {c.name}
                      {c.phone && <span className="ml-2 text-xs" style={{ color: 'var(--ink-3)' }}>{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>
            Selecione um existente ou digite um nome para criar automaticamente.
          </p>
        </Field>

        <Field label="Valor">
          <TextInput type="number" min="0" step="0.01" value={form.value} onChange={set('value')} placeholder="0,00" />
        </Field>

        <Field label="Funil">
          <select value={form.pipelineId} onChange={set('pipelineId')} className="select-base w-full">
            <option value="">Funil padrão</option>
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <Field label="Descrição">
          <textarea
            value={form.notes}
            onChange={set('notes')}
            placeholder="Descrição"
            rows={3}
            className="input-base resize-none"
            style={{ height: 'auto' }}
          />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <ModalActions onClose={onClose} pending={mutation.isPending} label="Adicionar negócio" />
      </form>
    </Modal>
  );
}

/* ── Shared modal actions ────────────────────────────── */

function ModalActions({ onClose, pending, label = 'Adicionar' }: { onClose: () => void; pending: boolean; label?: string }) {
  return (
    <div className="flex gap-2 justify-end pt-1">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm rounded-lg transition-colors"
        style={{ color: 'var(--ink-2)' }}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
      >
        {pending ? 'Salvando...' : label}
      </button>
    </div>
  );
}

/* ── Add dropdown button ─────────────────────────────── */

type ModalType = 'pessoa' | 'empresa' | 'negocio' | null;

function AddDropdown({ onSelect }: { onSelect: (t: ModalType) => void }) {
  const [open, setOpen] = useState(false);

  const opts: { type: ModalType; icon: React.ReactNode; label: string }[] = [
    { type: 'pessoa', icon: <UserRound className="w-4 h-4" />, label: 'Adicionar Pessoa' },
    { type: 'empresa', icon: <Building2 className="w-4 h-4" />, label: 'Adicionar Empresa' },
    { type: 'negocio', icon: <Briefcase className="w-4 h-4" />, label: 'Adicionar Negócio' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
      >
        <Plus className="w-4 h-4" />
        Novo
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-20 rounded-xl overflow-hidden shadow-lg min-w-[180px] animate-fade-up"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--edge-strong)',
              animationDuration: '0.15s',
            }}
          >
            {opts.map(({ type, icon, label }) => (
              <button
                key={type}
                onClick={() => { setOpen(false); onSelect(type); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
                style={{ color: 'var(--ink-1)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--ink-3)' }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */

export default function Contacts() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const openPanel = usePanelStore((s) => s.open);
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => listContacts(search || undefined),
    staleTime: 30_000,
  });

  const handleImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setImporting(true);
        try {
          const rows = (results.data as Record<string, string>[]).map((r) => ({
            name: r.nome || r.name || r.Name || '',
            phone: r.telefone || r.phone || r.Phone || '',
            email: r.email || r.Email || '',
            origin: r.origem || r.origin || '',
          }));
          const res = await api.post('/contacts/import', { rows });
          setImportResult(res.data);
          qc.invalidateQueries({ queryKey: ['contacts'] });
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = '';
        }
      },
    });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Contatos</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importando...' : 'Importar CSV'}
          </button>
          <input
            ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }}
          />
          <AddDropdown onSelect={setModal} />
        </div>
      </div>

      {importResult && (
        <div
          className="rounded-lg px-4 py-3 text-sm flex items-center justify-between"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
        >
          <span>
            {importResult.created} contato{importResult.created !== 1 ? 's' : ''} importado{importResult.created !== 1 ? 's' : ''},{' '}
            {importResult.skipped} ignorado{importResult.skipped !== 1 ? 's' : ''}.
          </span>
          <button onClick={() => setImportResult(null)} className="ml-3 flex-shrink-0 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-9"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {isLoading ? (
        <div className="text-sm" style={{ color: 'var(--ink-2)' }}>Carregando...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--ink-3)' }}>
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-4">{search ? 'Nenhum contato encontrado.' : 'Nenhum contato cadastrado ainda.'}</p>
          {!search && (
            <button
              onClick={() => setModal('pessoa')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro contato
            </button>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                {['Nome', 'Telefone', 'Email', 'Origem', 'Leads', ''].map((h, i) => (
                  <th
                    key={i}
                    className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wide ${
                      i === 2 ? 'hidden md:table-cell' : i === 3 ? 'hidden lg:table-cell' : ''
                    }`}
                    style={{ color: 'var(--ink-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--edge)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--ink-1)' }}>{contact.name}</div>
                        {(contact as any).company && (
                          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{(contact as any).company}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {contact.phone ? (
                      <span className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                        <Phone className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                        {contact.phone}
                      </span>
                    ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {contact.email ? (
                      <span className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                        <Mail className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                        {contact.email}
                      </span>
                    ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {contact.origin ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'var(--surface-raised)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
                      >
                        {contact.origin}
                      </span>
                    ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {(contact.leads?.length ?? 0) > 0 ? (
                      <span className="text-xs bg-brand-500/15 text-brand-500 px-2 py-0.5 rounded-full">
                        {contact.leads!.length} lead{contact.leads!.length !== 1 ? 's' : ''}
                      </span>
                    ) : <span className="text-xs" style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {(contact.leads?.length ?? 0) > 0 && (
                      <button
                        onClick={() => openPanel(contact.leads![0].id)}
                        title="Abrir lead"
                        className="p-1 transition-colors hover:text-brand-500"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddPessoaModal  open={modal === 'pessoa'}  onClose={() => setModal(null)} />
      <AddEmpresaModal open={modal === 'empresa'} onClose={() => setModal(null)} />
      <AddNegocioModal open={modal === 'negocio'} onClose={() => setModal(null)} />
    </div>
  );
}
