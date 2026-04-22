import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleDot, CheckCircle2, XCircle, ChevronDown, Check, Snowflake, Plus, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import type { LeadStatus } from '@/types/api';
import { createLossReason } from '@/api/loss-reasons';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function MiniCalendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const init = value ? new Date(value + 'T12:00:00') : today;
  const [cursor, setCursor] = useState({ year: init.getFullYear(), month: init.getMonth() });

  const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = value ? new Date(value + 'T12:00:00') : null;
  const isSelected = (d: number) => selected?.getFullYear() === cursor.year && selected?.getMonth() === cursor.month && selected?.getDate() === d;
  const isToday = (d: number) => today.getFullYear() === cursor.year && today.getMonth() === cursor.month && today.getDate() === d;

  const prev = () => setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  const pick = (d: number) => {
    const mm = String(cursor.month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${cursor.year}-${mm}-${dd}`);
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
      <div className="flex items-center justify-between px-2 py-1.5" style={{ borderBottom: '1px solid var(--edge)' }}>
        <button onClick={prev} className="p-0.5 rounded hover:bg-[var(--surface-hover)]" style={{ color: 'var(--ink-2)' }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-1)' }}>{MONTHS[cursor.month]} {cursor.year}</span>
        <button onClick={next} className="p-0.5 rounded hover:bg-[var(--surface-hover)]" style={{ color: 'var(--ink-2)' }}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 px-1 pt-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold pb-1" style={{ color: 'var(--ink-3)' }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className="flex items-center justify-center p-0.5">
            {d ? (
              <button
                onClick={() => pick(d)}
                className="w-6 h-6 rounded-full text-[11px] font-medium transition-colors"
                style={{
                  background: isSelected(d) ? '#0ea5e9' : isToday(d) ? 'var(--surface-hover)' : 'transparent',
                  color: isSelected(d) ? '#fff' : isToday(d) ? '#0ea5e9' : 'var(--ink-1)',
                  fontWeight: isToday(d) ? 700 : undefined,
                }}
              >{d}</button>
            ) : null}
          </div>
        ))}
      </div>
      {value && (
        <div className="flex justify-end px-2 pb-1.5">
          <button onClick={() => onChange('')} className="text-[10px] hover:underline" style={{ color: 'var(--ink-3)' }}>Limpar</button>
        </div>
      )}
    </div>
  );
}

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
  const [calendarOpen, setCalendarOpen] = useState(false);
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

  const close = () => { setOpen(false); setStep('menu'); setFreezeReason(''); setFrozenReturnDate(''); setSelectedReason(''); setAddingReason(false); setNewReasonLabel(''); setCalendarOpen(false); };

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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setCalendarOpen(o => !o)}
                  onKeyDown={e => e.key === 'Enter' && setCalendarOpen(o => !o)}
                  className="cursor-pointer"
                >
                  <div className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Retorno previsto (opcional)</div>
                  <div
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs select-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: frozenReturnDate ? 'var(--ink-1)' : 'var(--ink-3)' }}
                  >
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">
                      {frozenReturnDate
                        ? new Date(frozenReturnDate + 'T12:00:00').toLocaleDateString('pt-BR')
                        : 'Selecionar data'}
                    </span>
                  </div>
                </div>
                {calendarOpen && (
                  <div className="mt-1">
                    <MiniCalendar
                      value={frozenReturnDate}
                      onChange={(v) => { setFrozenReturnDate(v); setCalendarOpen(false); }}
                    />
                  </div>
                )}
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
