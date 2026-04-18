import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Briefcase, X } from 'lucide-react';
import { globalSearch } from '@/api/search';
import { usePanelStore } from '@/store/panel.store';
import { useNavigate } from 'react-router-dom';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const openPanel = usePanelStore((s) => s.open);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['search', q],
    queryFn: () => globalSearch(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="btn-ghost w-full justify-start"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span>Buscar</span>
        <kbd
          className="ml-auto text-xs px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--edge)',
            color: 'var(--ink-3)',
          }}
        >
          ⌘K
        </kbd>
      </button>
    );
  }

  const hasResults = data && (data.contacts.length > 0 || data.leads.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--edge)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar contatos, leads..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--ink-1)' }}
          />
          <button
            onClick={() => setOpen(false)}
            className="transition-colors hover:text-[var(--ink-1)]"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {q.trim().length >= 2 && (
          <div className="max-h-80 overflow-auto py-2">
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--ink-2)' }}>
                Nenhum resultado
              </div>
            ) : (
              <>
                {(data?.contacts ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { navigate('/contacts'); setOpen(false); setQ(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--surface-raised)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
                    >
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{c.name}</div>
                      {c.phone && <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{c.phone}</div>}
                    </div>
                  </button>
                ))}
                {(data?.leads ?? []).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { openPanel(l.id); setOpen(false); setQ(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center text-xs flex-shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--ink-1)' }}>{l.title || l.contact?.name}</div>
                      <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{l.pipeline?.name} · {l.stage?.name}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
