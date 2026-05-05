import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight,
  Mail, Phone, MessageCircle, FileText, MapPin, Users, StickyNote,
  CheckCircle2, Clock, List, CalendarDays, ChevronDown,
  Plus, Copy, Check, Trash2, X,
} from 'lucide-react';
import { listTasks, completeTask } from '@/api/tasks';
import { listAllActivities, completeContactActivity } from '@/api/contact-activities';
import { listUsers } from '@/api/users';
import { listAgendas, createAgenda, deleteAgenda } from '@/api/agendas';
import type { Agenda } from '@/api/agendas';
import { useAuthStore } from '@/store/auth.store';
import type { Task, TaskType } from '@/types/api';
import type { ContactActivity } from '@/api/contact-activities';

/* ── Constants ────────────────────────────────────── */

type CalView = 'month' | 'week' | 'day';
type DisplayMode = 'calendar' | 'list';
type StatusFilter = 'pending' | 'done';

const TASK_TYPE_ICON: Record<TaskType, typeof Mail> = {
  email: Mail, call: Phone, whatsapp: MessageCircle,
  proposal: FileText, meeting: Users, visit: MapPin,
};

const ACT_TYPE_ICON: Record<string, typeof Mail> = {
  note: StickyNote, call: Phone, whatsapp: MessageCircle,
  meeting: Users, visit: MapPin, proposal: FileText, email: Mail,
};

const TYPE_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  call:     { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  whatsapp: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  email:    { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  meeting:  { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  visit:    { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  proposal: { bg: '#e0e7ff', color: '#4338ca', border: '#a5b4fc' },
  note:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  task:     { bg: '#fdf4ff', color: '#86198f', border: '#e879f9' },
};

const DONE_COLOR = { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* ── Helpers ──────────────────────────────────────── */

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(d.getDate() - d.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ── Event model ──────────────────────────────────── */

interface CalEvent {
  id: string;
  kind: 'task' | 'activity';
  title: string;
  subtitle: string;
  date: Date;
  type: string;
  completed: boolean;
  raw: Task | ContactActivity;
}

function eventColor(e: CalEvent) {
  if (e.completed) return DONE_COLOR;
  return TYPE_COLOR[e.type] ?? TYPE_COLOR.note;
}

/* ── Event pill ───────────────────────────────────── */

function EventPill({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const Icon = event.kind === 'task'
    ? (TASK_TYPE_ICON[event.type as TaskType] ?? Clock)
    : (ACT_TYPE_ICON[event.type] ?? StickyNote);
  const c = eventColor(event);
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-left truncate transition-opacity hover:opacity-80"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="font-medium flex-shrink-0">{fmtTime(event.date)}</span>
      <span className="truncate">{event.subtitle || event.title}</span>
    </button>
  );
}

/* ── Event modal ──────────────────────────────────── */

function EventModal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const qc = useQueryClient();
  const completeTaskMut = useMutation({
    mutationFn: () => completeTask(event.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cal-tasks'] }); onClose(); },
  });
  const completeActMut = useMutation({
    mutationFn: () => completeContactActivity(event.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cal-activities'] }); onClose(); },
  });

  const c = eventColor(event);
  const Icon = event.kind === 'task'
    ? (TASK_TYPE_ICON[event.type as TaskType] ?? Clock)
    : (ACT_TYPE_ICON[event.type] ?? StickyNote);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-fade-up"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.color }}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink-1)' }}>{event.title}</div>
            {event.subtitle && (
              <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{event.subtitle}</div>
            )}
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {event.kind === 'task' ? 'Tarefa' : 'Atividade'} · {event.date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
          {event.completed && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />}
        </div>

        {event.kind === 'activity' && (event.raw as ContactActivity).body && (
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{(event.raw as ContactActivity).body}</p>
        )}

        {!event.completed && (
          <button
            onClick={() => event.kind === 'task' ? completeTaskMut.mutate() : completeActMut.mutate()}
            disabled={completeTaskMut.isPending || completeActMut.isPending}
            className="w-full py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
            style={{ background: '#10b981' }}
          >
            Marcar como concluído
          </button>
        )}
        <button onClick={onClose} className="w-full py-2 text-sm rounded-lg" style={{ color: 'var(--ink-3)', background: 'var(--surface-hover)' }}>
          Fechar
        </button>
      </div>
    </div>
  );
}

/* ── Month grid ───────────────────────────────────── */

function MonthGrid({ year, month, events, onDayClick, onEventClick }: {
  year: number; month: number;
  events: CalEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalEvent) => void;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = startPad + lastDay.getDate();
  const weeks = Math.ceil(totalCells / 7);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide py-1.5" style={{ color: 'var(--ink-3)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--edge)' }}>
        {Array.from({ length: weeks * 7 }).map((_, i) => {
          const dayNum = i - startPad + 1;
          const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate();
          const d = isCurrentMonth ? new Date(year, month, dayNum) : null;
          const isToday = d && isSameDay(d, today);
          const key = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '';
          const dayEvents = (d && eventsByDay.get(key)) ?? [];
          return (
            <div
              key={i}
              onClick={() => d && onDayClick(d)}
              className="min-h-[100px] p-1.5 cursor-pointer transition-colors"
              style={{ background: isToday ? 'rgba(99,102,241,0.04)' : 'var(--surface)', opacity: isCurrentMonth ? 1 : 0.3 }}
            >
              <div
                className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1"
                style={{ background: isToday ? 'var(--brand-500,#6366f1)' : 'transparent', color: isToday ? '#fff' : 'var(--ink-2)' }}
              >
                {isCurrentMonth ? dayNum : ''}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />
                ))}
                {dayEvents.length > 3 && (
                  <button
                    onClick={(ev) => { ev.stopPropagation(); d && onDayClick(d); }}
                    className="text-[10px] px-1 hover:underline"
                    style={{ color: 'var(--brand-500,#6366f1)' }}
                  >
                    +{dayEvents.length - 3} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week grid ────────────────────────────────────── */

function WeekGrid({ weekStart, events, onEventClick }: {
  weekStart: Date; events: CalEvent[]; onEventClick: (e: CalEvent) => void;
}) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <>
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--edge)' }}>
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toISOString()} className="py-2 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>{WEEKDAYS[d.getDay()]}</span>
              <div
                className="mx-auto mt-1 w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: isToday ? 'var(--brand-500,#6366f1)' : 'transparent', color: isToday ? '#fff' : 'var(--ink-2)' }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--edge)' }}>
        {days.map((d) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, d));
          return (
            <div key={d.toISOString()} className="min-h-[200px] p-2 space-y-1" style={{ background: 'var(--surface)' }}>
              {dayEvents.map((e) => <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />)}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Day view ─────────────────────────────────────── */

function DayView({ day, events, onEventClick }: {
  day: Date; events: CalEvent[]; onEventClick: (e: CalEvent) => void;
}) {
  const dayEvents = events.filter((e) => isSameDay(e.date, day)).sort((a, b) => a.date.getTime() - b.date.getTime());
  return (
    <div className="space-y-2 p-4">
      {dayEvents.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--ink-3)' }}>Nenhum evento neste dia.</p>
      ) : (
        dayEvents.map((e) => {
          const c = eventColor(e);
          const Icon = e.kind === 'task'
            ? (TASK_TYPE_ICON[e.type as TaskType] ?? Clock)
            : (ACT_TYPE_ICON[e.type] ?? StickyNote);
          return (
            <button
              key={e.id}
              onClick={() => onEventClick(e)}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-opacity hover:opacity-80"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <span className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.color + '22', color: c.color }}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: c.color }}>{e.title}</div>
                {e.subtitle && <div className="text-xs truncate mt-0.5" style={{ color: c.color + 'bb' }}>{e.subtitle}</div>}
                <div className="text-xs mt-0.5" style={{ color: c.color + 'aa' }}>
                  {fmtTime(e.date)} · {e.kind === 'task' ? 'Tarefa' : 'Atividade'}{e.completed ? ' · Concluído' : ''}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ── List view ────────────────────────────────────── */

function ListView({ events, onEventClick }: { events: CalEvent[]; onEventClick: (e: CalEvent) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of [...events].sort((a, b) => a.date.getTime() - b.date.getTime())) {
      const key = e.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  if (grouped.size === 0) {
    return (
      <div className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>
        <p className="text-sm">Nenhum evento encontrado.</p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--edge)' }}>
      {[...grouped.entries()].map(([day, evs]) => (
        <div key={day}>
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ background: 'var(--surface-raised)', color: 'var(--ink-3)' }}>
            {day}
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--edge)' }}>
            {evs.map((e) => {
              const c = eventColor(e);
              const Icon = e.kind === 'task'
                ? (TASK_TYPE_ICON[e.type as TaskType] ?? Clock)
                : (ACT_TYPE_ICON[e.type] ?? StickyNote);
              return (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--ink-1)' }}>{e.title}</div>
                    {e.subtitle && <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{e.subtitle}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{fmtTime(e.date)}</div>
                    {e.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── User filter dropdown ─────────────────────────── */

function UserFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const me = useAuthStore((s) => s.user);
  const { data: users = [] } = useQuery({ queryKey: ['users-cal'], queryFn: listUsers });

  const options = [
    { id: 'all', label: 'Todos' },
    { id: 'me', label: 'Eu' },
    ...users.filter((u) => u.id !== me?.id).map((u) => ({ id: u.id, label: u.name })),
  ];

  const label = options.find((o) => o.id === value)?.label ?? 'Todos';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
        style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)', background: 'var(--surface)' }}
      >
        {label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 mt-1 z-20 rounded-xl shadow-lg py-1 min-w-[140px]"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
          >
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: value === o.id ? 'var(--brand-500,#6366f1)' : 'var(--ink-2)', fontWeight: value === o.id ? 600 : 400 }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Agendas tab ──────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copiar ID"
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
      style={{ background: 'var(--surface-hover)', color: copied ? '#10b981' : 'var(--ink-3)', border: '1px solid var(--edge)' }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : text.slice(0, 8) + '…'}
    </button>
  );
}

function AgendasPanel({ onGoToCalendar }: { onGoToCalendar: (ownerId: string) => void }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isOwner = me?.role === 'owner';

  const { data: agendas = [], isLoading } = useQuery({ queryKey: ['agendas'], queryFn: listAgendas });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');

  // Users that still don't have an agenda (exclude users who already have one)
  const agendaOwnerIds = new Set(agendas.map((a) => a.ownerId).filter(Boolean));
  const availableUsers = users.filter((u) => !agendaOwnerIds.has(u.id));
  // Non-owner users (collaborators only, no owner — since owner agenda is auto-created)
  const collaborators = availableUsers.filter((u) => u.id !== me?.id);
  const noCollaborators = collaborators.length === 0 && availableUsers.filter((u) => u.id === me?.id).length === 0;

  const handleNewAgenda = () => {
    if (!isOwner) return;
    if (noCollaborators) {
      alert('Nenhum colaborador disponível. Crie um novo colaborador primeiro em Configurações > Equipe.');
      return;
    }
    setShowForm(true);
  };

  const createMut = useMutation({
    mutationFn: () => {
      const ownerUser = users.find((u) => u.id === newOwnerId);
      return createAgenda({
        name: newName.trim() || `Agenda de ${ownerUser?.name ?? 'Colaborador'}`,
        ownerId: newOwnerId,
        ownerName: ownerUser?.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendas'] });
      setShowForm(false);
      setNewName('');
      setNewOwnerId('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAgenda(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agendas'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-1)' }}>Agendas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>Cada agenda está vinculada a um membro da equipe. Clique em uma agenda para ver seu calendário.</p>
        </div>
        {isOwner && (
          <button
            onClick={handleNewAgenda}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-500)' }}
          >
            <Plus className="w-4 h-4" />
            Nova agenda
          </button>
        )}
      </div>

      {/* Create form (owner only) */}
      {isOwner && showForm && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Nova agenda</span>
            <button onClick={() => { setShowForm(false); setNewName(''); setNewOwnerId(''); }}>
              <X className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>
              Colaborador responsável <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              autoFocus
              value={newOwnerId}
              onChange={(e) => {
                const uid = e.target.value;
                setNewOwnerId(uid);
                const u = users.find((u) => u.id === uid);
                if (u && !newName) setNewName(`Agenda de ${u.name}`);
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            >
              <option value="">Selecione um colaborador</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-2)' }}>Nome da agenda</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Agenda do João"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setNewName(''); setNewOwnerId(''); }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--ink-2)', background: 'var(--surface-hover)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!newOwnerId || createMut.isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand-500)' }}
            >
              {createMut.isPending ? 'Criando…' : 'Criar agenda'}
            </button>
          </div>
        </div>
      )}

      {/* Agenda list */}
      {isLoading && (
        <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>Carregando…</div>
      )}

      {!isLoading && agendas.length === 0 && !showForm && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: 'var(--surface-raised)', border: '1px dashed var(--edge)' }}
        >
          <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Nenhuma agenda encontrada</p>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
            {isOwner ? 'A sua agenda é criada automaticamente ao criar sua conta.' : 'Sua agenda ainda não foi configurada pelo administrador.'}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agendas.map((agenda: Agenda) => {
          const owner = users.find((u) => u.id === agenda.ownerId);
          const ownerLabel = owner?.name ?? agenda.ownerName ?? 'Sem responsável';
          return (
            <div
              key={agenda.id}
              onClick={() => agenda.ownerId && onGoToCalendar(agenda.ownerId)}
              className="rounded-xl p-4 space-y-3 cursor-pointer transition-colors hover:border-[var(--brand-500)]"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink-1)' }}>{agenda.name}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{ownerLabel}</span>
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir agenda "${agenda.name}"?`)) deleteMut.mutate(agenda.id);
                    }}
                    className="p-1 rounded transition-colors hover:bg-red-50"
                    title="Excluir agenda"
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                  </button>
                )}
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-3)' }}>
                  ID da agenda no FlowCRM
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <code className="text-[11px] font-mono flex-1 truncate" style={{ color: 'var(--ink-2)' }}>{agenda.id}</code>
                  <CopyButton text={agenda.id} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: agenda.isActive ? '#10b981' : '#94a3b8' }}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    {agenda.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--brand-500)' }}>
                  <CalendarDays className="w-3 h-3" /> Ver calendário
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────── */

export default function Calendario() {
  const today = new Date();
  const me = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'agendas' | 'calendario'>('agendas');

  const [view, setView] = useState<CalView>('month');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [userFilter, setUserFilter] = useState<string>('me');
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const { from, to } = useMemo(() => {
    if (view === 'month') {
      return {
        from: new Date(current.getFullYear(), current.getMonth(), 1).toISOString(),
        to: new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59).toISOString(),
      };
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      return { from: ws.toISOString(), to: addDays(ws, 6).toISOString() };
    }
    const d = selectedDay ?? current;
    return {
      from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
      to: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString(),
    };
  }, [view, current, selectedDay]);

  const assigneeId = userFilter === 'me' ? me?.id : userFilter === 'all' ? undefined : userFilter;

  const { data: tasks = [] } = useQuery({
    queryKey: ['cal-tasks', from, to, assigneeId],
    queryFn: () => listTasks({ dueFrom: from.slice(0, 10), dueTo: to.slice(0, 10), assigneeId }),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['cal-activities', from, to],
    queryFn: () => listAllActivities(from, to),
  });

  const allEvents = useMemo<CalEvent[]>(() => {
    const taskEvents: CalEvent[] = tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: t.id,
        kind: 'task',
        title: t.description,
        subtitle: t.targetLabel ?? '',
        date: new Date(t.dueDate!),
        type: t.type,
        completed: t.status === 'completed',
        raw: t,
      }));

    const actEvents: CalEvent[] = activities
      .filter((a) => {
        if (!a.scheduledAt) return false;
        if (userFilter === 'me') return a.createdById === me?.id;
        if (userFilter !== 'all') return a.createdById === userFilter;
        return true;
      })
      .map((a) => {
        const linked = a.contact?.name ?? a.company?.name ?? '';
        const shortBody = a.body.length > 50 ? a.body.slice(0, 50) + '…' : a.body;
        return {
          id: a.id,
          kind: 'activity' as const,
          title: shortBody,
          subtitle: linked,
          date: new Date(a.scheduledAt!),
          type: a.type,
          completed: !!a.completedAt,
          raw: a,
        };
      });

    return [...taskEvents, ...actEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, activities, userFilter, me]);

  const events = useMemo(() => {
    return allEvents.filter((e) => statusFilter === 'pending' ? !e.completed : e.completed);
  }, [allEvents, statusFilter]);

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') setCurrent(new Date(current.getFullYear(), current.getMonth() + dir, 1));
    else if (view === 'week') setCurrent(addDays(current, dir * 7));
    else setSelectedDay(addDays(selectedDay ?? current, dir));
  };

  const title = useMemo(() => {
    if (view === 'month') return `${MONTHS[current.getMonth()]} de ${current.getFullYear()}`;
    if (view === 'week') {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      return `${ws.getDate()} – ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`;
    }
    const d = selectedDay ?? current;
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [view, current, selectedDay]);

  const handleDayClick = (d: Date) => {
    setSelectedDay(d);
    setView('day');
  };

  const pendingCount = allEvents.filter((e) => !e.completed).length;

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Page header + tab bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>Agenda</h1>
        </div>
        <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
          <button
            onClick={() => setActiveTab('agendas')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{ background: activeTab === 'agendas' ? 'var(--surface-raised)' : 'transparent', color: 'var(--ink-2)', boxShadow: activeTab === 'agendas' ? 'var(--shadow-sm,0 1px 3px rgba(0,0,0,.12))' : 'none' }}
          >
            Agendas
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{ background: activeTab === 'calendario' ? 'var(--surface-raised)' : 'transparent', color: 'var(--ink-2)', boxShadow: activeTab === 'calendario' ? 'var(--shadow-sm,0 1px 3px rgba(0,0,0,.12))' : 'none' }}
          >
            Calendário
          </button>
        </div>
      </div>

      {/* Agendas tab */}
      {activeTab === 'agendas' && (
        <AgendasPanel
          onGoToCalendar={(ownerId) => {
            setUserFilter(ownerId);
            setActiveTab('calendario');
          }}
        />
      )}

      {/* Calendário tab */}
      {activeTab === 'calendario' && (<>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3" />

        <div className="flex items-center gap-2">
          {/* Status tabs */}
          <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
            <button
              onClick={() => setStatusFilter('pending')}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: statusFilter === 'pending' ? 'var(--surface-raised)' : 'transparent', color: 'var(--ink-2)', boxShadow: statusFilter === 'pending' ? 'var(--shadow-sm,0 1px 3px rgba(0,0,0,.12))' : 'none' }}
            >
              Pendentes
              {pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>{pendingCount}</span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('done')}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: statusFilter === 'done' ? 'var(--surface-raised)' : 'transparent', color: 'var(--ink-2)', boxShadow: statusFilter === 'done' ? 'var(--shadow-sm,0 1px 3px rgba(0,0,0,.12))' : 'none' }}
            >
              Finalizadas
            </button>
          </div>

          {/* User filter */}
          <UserFilter value={userFilter} onChange={setUserFilter} />

          {/* Display mode toggle */}
          <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
            <button
              onClick={() => setDisplayMode('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: displayMode === 'list' ? 'var(--surface-raised)' : 'transparent', color: 'var(--ink-2)', boxShadow: displayMode === 'list' ? 'var(--shadow-sm,0 1px 3px rgba(0,0,0,.12))' : 'none' }}
            >
              <List className="w-3.5 h-3.5" />
              Listagem
            </button>
            <button
              onClick={() => setDisplayMode('calendar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: displayMode === 'calendar' ? 'var(--surface-raised)' : 'transparent', color: 'var(--ink-2)', boxShadow: displayMode === 'calendar' ? 'var(--shadow-sm,0 1px 3px rgba(0,0,0,.12))' : 'none' }}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendário
            </button>
          </div>
        </div>
      </div>

      {/* Navigation (calendar mode only) */}
      {displayMode === 'calendar' && (
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg p-0.5 mr-1" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
            {(['month', 'week', 'day'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={{ background: view === v ? 'var(--brand-500,#6366f1)' : 'transparent', color: view === v ? '#fff' : 'var(--ink-2)' }}
              >
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCurrent(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
          >
            Hoje
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold ml-1 capitalize" style={{ color: 'var(--ink-1)' }}>{title}</h2>
        </div>
      )}

      {/* Legend (calendar mode only) */}
      {displayMode === 'calendar' && (
        <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: 'var(--ink-3)' }}>
          {[
            { type: 'call', label: 'Ligação' },
            { type: 'email', label: 'E-mail' },
            { type: 'meeting', label: 'Reunião' },
            { type: 'whatsapp', label: 'WhatsApp' },
            { type: 'task', label: 'Tarefa' },
          ].map(({ type, label }) => {
            const c = TYPE_COLOR[type];
            return (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--edge)' }}>
        {displayMode === 'list' ? (
          <ListView events={events} onEventClick={setSelectedEvent} />
        ) : view === 'month' ? (
          <MonthGrid year={current.getFullYear()} month={current.getMonth()} events={events} onDayClick={handleDayClick} onEventClick={setSelectedEvent} />
        ) : view === 'week' ? (
          <WeekGrid weekStart={startOfWeek(current)} events={events} onEventClick={setSelectedEvent} />
        ) : (
          <DayView day={selectedDay ?? current} events={events} onEventClick={setSelectedEvent} />
        )}
      </div>

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      </>)}
    </div>
  );
}
