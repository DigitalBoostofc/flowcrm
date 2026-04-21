import { useState, useRef, useEffect } from 'react';
import { CircleDot, CheckCircle2, XCircle, ChevronDown, Check } from 'lucide-react';
import type { LeadStatus } from '@/types/api';

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; Icon: typeof CircleDot }> = {
  active: { label: 'Em andamento', color: '#635BFF', bg: 'rgba(99,91,255,0.1)',  Icon: CircleDot    },
  won:    { label: 'Ganho',        color: '#10B981', bg: 'rgba(16,185,129,0.1)', Icon: CheckCircle2 },
  lost:   { label: 'Perdido',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  Icon: XCircle      },
};

export function StatusDropdown({
  lead,
  lossReasons,
  onUpdate,
}: {
  lead: { id: string; status: LeadStatus };
  lossReasons: { id: string; label: string }[];
  onUpdate: (id: string, status: LeadStatus, lossReason?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [lostStep, setLostStep] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setLostStep(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const choose = (status: LeadStatus) => {
    if (status === 'lost') { setLostStep(true); return; }
    onUpdate(lead.id, status);
    setOpen(false);
  };

  const cfg = STATUS_CONFIG[lead.status];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setLostStep(false); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        <cfg.Icon className="w-3 h-3" />
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 min-w-[180px]"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        >
          {!lostStep ? (
            (Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([key, s]) => (
              <button
                key={key}
                onClick={() => choose(key)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: key === lead.status ? s.color : 'var(--ink-1)' }}
              >
                <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                {s.label}
                {key === lead.status && <Check className="w-3 h-3 ml-auto" style={{ color: s.color }} />}
              </button>
            ))
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--edge)' }}>
                Motivo da perda
              </div>
              <button
                onClick={() => { onUpdate(lead.id, 'lost'); setOpen(false); setLostStep(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--ink-3)' }}
              >
                Sem motivo
              </button>
              {lossReasons.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { onUpdate(lead.id, 'lost', r.label); setOpen(false); setLostStep(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--ink-1)' }}
                >
                  {r.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
