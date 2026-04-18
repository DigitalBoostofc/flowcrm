import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Phone, Mail, User, ExternalLink, Upload, X } from 'lucide-react';
import Papa from 'papaparse';
import { listContacts } from '@/api/contacts';
import { usePanelStore } from '@/store/panel.store';
import { api } from '@/api/client';

export default function Contacts() {
  const [search, setSearch] = useState('');
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
        <div className="flex items-center gap-3">
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
          <p>{search ? 'Nenhum contato encontrado.' : 'Nenhum contato cadastrado ainda.'}</p>
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
    </div>
  );
}
