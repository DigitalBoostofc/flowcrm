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
        <h1 className="text-2xl font-bold">Contatos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50"
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
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
          <span>
            {importResult.created} contato{importResult.created !== 1 ? 's' : ''} importado{importResult.created !== 1 ? 's' : ''}, {importResult.skipped} ignorado{importResult.skipped !== 1 ? 's' : ''} (duplicatas ou sem nome).
          </span>
          <button onClick={() => setImportResult(null)} className="text-emerald-400 hover:text-emerald-200 ml-3 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
        />
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Carregando...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhum contato encontrado.' : 'Nenhum contato cadastrado ainda.'}</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Telefone</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide hidden lg:table-cell">Origem</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Leads</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-100">{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {contact.phone ? (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {contact.phone}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {contact.email ? (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {contact.email}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {contact.origin ? (
                      <span className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300">
                        {contact.origin}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(contact.leads?.length ?? 0) > 0 ? (
                      <span className="text-xs bg-brand-600/20 text-brand-400 px-2 py-0.5 rounded-full">
                        {contact.leads!.length} lead{contact.leads!.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(contact.leads?.length ?? 0) > 0 && (
                      <button
                        onClick={() => openPanel(contact.leads![0].id)}
                        title="Abrir lead"
                        className="p-1 text-slate-500 hover:text-brand-400 transition-colors"
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
