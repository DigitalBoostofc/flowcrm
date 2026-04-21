import { useState, useRef, useEffect } from 'react';
import { CircleDot, CheckCircle2, XCircle, ChevronDown, Check, Snowflake } from 'lucide-react';
import type { LeadStatus } from '@/types/api';

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; Icon: typeof CircleDot }> = {
  active:  { label: 'Em andamento', color: '#635BFF', bg: 'rgba(99,91,255,0.1)',   Icon: CircleDot    },
  won:     { label: 'Ganho',        color: '#10B981', bg: 'rgba(16,185,129,0.1)',  Icon: CheckCircle2 },
  lost:    { label: 'Perdido',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   Icon: XCircle      },
  frozen:  { label: 'Congelado',    color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  Icon: Snowflake    },
};

type Step = 'menu' | 'lost' | 'frozen';

export function StatusDropdown({
  lead,
  lossReasons,
  onUpdate,
}: {
  lead: { id: string; status: LeadStatus };
  lossReasons: { id: string; label: string }[];
  onUpdate: (id: string, status: LeadStatus, extra?: { lossReason?: string; freezeReason?: string; frozenReturnDate?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [freezeReason, setFreezeReason] = useState('');
  const [frozenReturnDate, setFrozenReturnDate] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setStep('menu');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => { setOpen(false); setStep('menu'); setFreezeReason(''); setFrozenReturnDate(''); };

  const choose = (status: LeadStatus) => {
    if (status === 'lost') { setStep('lost'); return; }
    if (status === 'frozen') { setStep('frozen'); return; }
    onUpdate(lead.id, status);
    close();
  };

  const confirmFrozen = () => {
    onUpdate(lead.id, 'frozen', {
      freezeReason: freezeReason.trim() || undefined,
      frozenReturnDate: frozenReturnDate || undefined,
    });
    close();
  };

  const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.active;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setStep('menu'); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        <cfg.Icon className="w-3 h-3" />
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 min-w-[200px]"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        >
          {step === 'menu' && (
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
          )}

          {step === 'lost' && (
            <>
              <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--ink-2)', borderBottom: '1px solid var(--edge)' }}>
                Motivo da perda
              </div>
              <button
                onClick={() => { onUpdate(lead.id, 'lost'); close(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--ink-3)' }}
              >
                Sem motivo
              </button>
              {lossReasons.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { onUpdate(lead.id, 'lost', { lossReason: r.label }); close(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--ink-1)' }}
                >
                  {r.label}
                </button>
              ))}
            </>
          )}

          {step === 'frozen' && (
            <div className="p-3 space-y-3">
              <div className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Congelar negócio</div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--ink-3)' }}>Motivo (opcional)</label>
                <input
                  autoFocus
                  type="text"
                  value={freezeReason}
                  onChange={e => setFreezeReason(e.target.value)}
                  placeholder="Ex: Aguardando orçamento"
                  className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--ink-3)' }}>Retorno previsto (opcional)</label>
                <input
                  type="date"
                  value={frozenReturnDate}
                  onChange={e => setFrozenReturnDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md text-xs outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('menu')}
                  className="flex-1 px-2 py-1.5 rounded-md text-xs"
                  style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
                >
                  Voltar
                </button>
                <button
                  onClick={confirmFrozen}
                  className="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold text-white"
                  style={{ background: '#0ea5e9' }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
