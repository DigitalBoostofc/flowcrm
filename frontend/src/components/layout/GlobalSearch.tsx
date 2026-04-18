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
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 text-sm transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Buscar</span>
        <kbd className="ml-auto text-xs bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">⌘K</kbd>
      </button>
    );
  }

  const hasResults = data && (data.contacts.length > 0 || data.leads.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar contatos, leads..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-slate-100 text-sm focus:outline-none placeholder:text-slate-500"
          />
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {q.trim().length >= 2 && (
          <div className="max-h-80 overflow-auto py-2">
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">Nenhum resultado</div>
            ) : (
              <>
                {(data?.contacts ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { navigate('/contacts'); setOpen(false); setQ(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{c.name}</div>
                      {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                    </div>
                  </button>
                ))}
                {(data?.leads ?? []).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { openPanel(l.id); setOpen(false); setQ(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs flex-shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{l.title || l.contact?.name}</div>
                      <div className="text-xs text-slate-500">{l.pipeline?.name} · {l.stage?.name}</div>
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
