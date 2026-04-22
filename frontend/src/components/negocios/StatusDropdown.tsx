import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleDot, CheckCircle2, XCircle, ChevronDown, Check, Snowflake, Plus, X } from 'lucide-react';
import type { LeadStatus } from '@/types/api';
import { createLossReason } from '@/api/loss-reasons';

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
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [freezeReason, setFreezeReason] = useState('');
  const [frozenReturnDate, setFrozenReturnDate] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [addingReason, setAddingReason] = useState(false);
  const [newReasonLabel, setNewReasonLabel] = useState('');
  const newReasonRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const createReasonMut = useMutation({
    mutationFn: (label: string) => createLossReason(label),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['loss-reasons'] });
      setSelectedReason(created.label);
      setAddingReason(false);
      setNewReasonLabel('');
    },
  });

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

  const close = () => { setOpen(false); setStep('menu'); setFreezeReason(''); setFrozenReturnDate(''); setSelectedReason(''); setAddingReason(false); setNewReasonLabel(''); };

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
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--edge)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Motivo da perda</span>
                {!addingReason && (
                  <button
                    onClick={() => { setAddingReason(true); setTimeout(() => newReasonRef.current?.focus(), 50); }}
                    className="flex items-center gap-1 text-xs hover:opacity-80"
                    style={{ color: 'var(--brand-500, #6366f1)' }}
                  >
                    <Plus className="w-3 h-3" /> Novo
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto">
                {lossReasons.map((r) => {
                  const active = selectedReason === r.label;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReason(active ? '' : r.label)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                      style={{
                        background: active ? 'var(--surface-hover)' : 'transparent',
                        fontWeight: active ? 600 : 400,
                        color: 'var(--ink-1)',
                      }}
                    >
                      <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                        {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--brand-500, #6366f1)' }} strokeWidth={3} />}
                      </div>
                      {r.label}
                    </button>
                  );
                })}
                {(() => {
                  const active = selectedReason === '__sem_motivo__';
                  return (
                    <button
                      key="__sem_motivo__"
                      onClick={() => setSelectedReason(active ? '' : '__sem_motivo__')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                      style={{
                        background: active ? 'var(--surface-hover)' : 'transparent',
                        fontWeight: active ? 600 : 400,
                        color: 'var(--ink-2)',
                      }}
                    >
                      <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                        {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--brand-500, #6366f1)' }} strokeWidth={3} />}
                      </div>
                      Sem motivo
                    </button>
                  );
                })()}
              </div>

              {addingReason && (
                <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderTop: '1px solid var(--edge)' }}>
                  <input
                    ref={newReasonRef}
                    value={newReasonLabel}
                    onChange={e => setNewReasonLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newReasonLabel.trim()) createReasonMut.mutate(newReasonLabel.trim());
                      if (e.key === 'Escape') { setAddingReason(false); setNewReasonLabel(''); }
                    }}
                    placeholder="Nome do motivo..."
                    className="flex-1 px-2 py-1 rounded-md text-xs outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
                  />
                  <button
                    onClick={() => newReasonLabel.trim() && createReasonMut.mutate(newReasonLabel.trim())}
                    disabled={!newReasonLabel.trim() || createReasonMut.isPending}
                    className="px-2 py-1 rounded-md text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--brand-500, #6366f1)' }}
                  >
                    {createReasonMut.isPending ? '...' : 'Ok'}
                  </button>
                  <button
                    onClick={() => { setAddingReason(false); setNewReasonLabel(''); }}
                    className="p-1 rounded hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 p-2" style={{ borderTop: '1px solid var(--edge)' }}>
                <button
                  onClick={() => {
                    const reason = selectedReason === '__sem_motivo__' ? undefined : selectedReason || undefined;
                    onUpdate(lead.id, 'lost', { lossReason: reason });
                    close();
                  }}
                  disabled={!selectedReason}
                  className="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: 'var(--brand-500, #6366f1)' }}
                >
                  Salvar
                </button>
              </div>
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
