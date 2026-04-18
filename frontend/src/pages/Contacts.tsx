import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Phone, Mail, User, ExternalLink, Upload, X, Plus } from 'lucide-react';
import Papa from 'papaparse';
import { listContacts, createContact } from '@/api/contacts';
import { usePanelStore } from '@/store/panel.store';
import { api } from '@/api/client';
import Modal from '@/components/ui/Modal';

function AddContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', email: '', origin: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setForm({ name: '', phone: '', email: '', origin: '' });
      setError('');
      onClose();
    },
    onError: () => setError('Erro ao criar contato. Verifique os dados e tente novamente.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }
    setError('');
    mutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      origin: form.origin.trim() || undefined,
    });
  };

  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { type?: string; required?: boolean; placeholder?: string },
  ) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-3)' }}>
        {label}{opts?.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={opts?.type ?? 'text'}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="input-base"
        autoComplete="off"
      />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Novo contato">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {field('Nome', 'name', { required: true, placeholder: 'Ex: João Silva' })}
        {field('Telefone', 'phone', { type: 'tel', placeholder: 'Ex: +55 11 91234-5678' })}
        {field('Email', 'email', { type: 'email', placeholder: 'Ex: joao@email.com' })}
        {field('Origem', 'origin', { placeholder: 'Ex: Instagram, Indicação...' })}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--ink-2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink-1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {mutation.isPending ? 'Salvando...' : 'Criar contato'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Contacts() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
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
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importando...' : 'Importar CSV'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }}
          />
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo contato
          </button>
        </div>
      </div>

      {importResult && (
        <div className="rounded-lg px-4 py-3 text-sm flex items-center justify-between"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
          <span>
            {importResult.created} contato{importResult.created !== 1 ? 's' : ''} importado{importResult.created !== 1 ? 's' : ''},{' '}
            {importResult.skipped} ignorado{importResult.skipped !== 1 ? 's' : ''} (duplicatas ou sem nome).
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
              onClick={() => setShowAdd(true)}
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
                      <span className="font-medium" style={{ color: 'var(--ink-1)' }}>{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {contact.phone ? (
                      <span className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                        <Phone className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                        {contact.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {contact.email ? (
                      <span className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                        <Mail className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                        {contact.email}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {contact.origin ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'var(--surface-raised)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
                      >
                        {contact.origin}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(contact.leads?.length ?? 0) > 0 ? (
                      <span className="text-xs bg-brand-500/15 text-brand-500 px-2 py-0.5 rounded-full">
                        {contact.leads!.length} lead{contact.leads!.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
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

      <AddContactModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
