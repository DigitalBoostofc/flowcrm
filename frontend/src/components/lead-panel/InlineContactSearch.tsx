import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit2 } from 'lucide-react';
import { listContacts } from '@/api/contacts';
import { listCompanies } from '@/api/companies';

interface Props {
  currentName: string;
  mode: 'contact' | 'company';
  onSelect: (id: string, name: string) => void;
}

export default function InlineContactSearch({ currentName, mode, onSelect }: Props) {
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: contactResults } = useQuery({
    queryKey: ['contact-search', search],
    queryFn: () => listContacts(search, { limit: 10 }),
    enabled: editing && mode === 'contact',
  });

  const { data: companyResults } = useQuery({
    queryKey: ['company-search', search],
    queryFn: () => listCompanies(search, { limit: 10 }),
    enabled: editing && mode === 'company',
  });

  const results = mode === 'contact'
    ? (contactResults?.items ?? []).map((c) => ({ id: c.id, name: c.name }))
    : (companyResults?.items ?? []).map((c) => ({ id: c.id, name: c.name }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setEditing(false);
    };
    if (editing) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  if (!editing) {
    return (
      <button
        onClick={() => { setSearch(''); setEditing(true); }}
        className="text-sm text-left w-full flex items-center gap-1 group"
        style={{ color: 'var(--ink-1)' }}
      >
        <span style={!currentName ? { color: 'var(--ink-3)', fontStyle: 'italic' } : {}}>
          {currentName || '—'}
        </span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-40 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Buscar ${mode === 'contact' ? 'pessoa' : 'empresa'}...`}
        className="w-full px-2 py-1 rounded-md text-sm focus:outline-none"
        style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--ink-1)' }}
        onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
      />
      {results.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-xl"
          style={{ background: 'var(--surface-raised, #1e2230)', border: '1px solid var(--edge, rgba(255,255,255,0.1))' }}
        >
          {results.map((r) => (
            <button
              key={r.id}
              role="option"
              onClick={() => { onSelect(r.id, r.name); setEditing(false); }}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--ink-1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover, rgba(255,255,255,0.06))')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
