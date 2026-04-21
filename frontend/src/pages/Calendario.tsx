import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Calendar, List,
  Mail, Phone, MessageCircle, FileText, MapPin, Users, StickyNote,
  CheckCircle2, Clock,
} from 'lucide-react';
import { listTasks, completeTask } from '@/api/tasks';
import { listAllActivities, completeContactActivity } from '@/api/contact-activities';
import type { Task, TaskType } from '@/types/api';
import type { ContactActivity } from '@/api/contact-activities';
import { formatBRL } from '@/lib/format';

/* ── Helpers ─────────────────────────────────────────── */

type CalView = 'month' | 'week' | 'day';

const TASK_TYPE_ICON: Record<TaskType, typeof Mail> = {
  email: Mail, call: Phone, whatsapp: MessageCircle,
  proposal: FileText, meeting: Users, visit: MapPin,
};

const ACT_TYPE_ICON: Record<string, typeof Mail> = {
  note: StickyNote, call: Phone, whatsapp: MessageCircle,
  meeting: Users, visit: MapPin, proposal: FileText, email: Mail,
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

interface CalEvent {
  id: string;
  kind: 'task' | 'activity';
  title: string;
  date: Date;
  type: string;
  completed: boolean;
  raw: Task | ContactActivity;
}

function eventColor(e: CalEvent) {
  if (e.completed) return { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' };
  if (e.kind === 'task') return { bg: '#ede9fe', color: '#5b21b6', border: '#a78bfa' };
  return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' };
}

/* ── Event pill ──────────────────────────────────────── */

function EventPill({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const Icon = event.kind === 'task'
    ? (TASK_TYPE_ICON[event.type as TaskType] ?? Clock)
    : (ACT_TYPE_ICON[event.type] ?? StickyNote);
  const c = eventColor(event);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-left truncate transition-opacity hover:opacity-80"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

/* ── Event detail modal ──────────────────────────────── */

function EventModal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const qc = useQueryClient();
  const completeTaskMut = useMutation({
    mutationFn: () => completeTask(event.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-tasks'] }); onClose(); },
  });
  const completeActMut = useMutation({
    mutationFn: () => completeContactActivity(event.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-activities'] }); onClose(); },
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: c.bg, color: c.color }}
          >
            <Icon className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink-1)' }}>{event.title}</div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {event.kind === 'task' ? 'Tarefa' : 'Atividade'} · {event.date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
          {event.completed && (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          )}
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

/* ── Month grid ──────────────────────────────────────── */

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
          <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide py-1" style={{ color: 'var(--ink-3)' }}>{d}</div>
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
              style={{
                background: isToday ? 'rgba(99,102,241,0.05)' : 'var(--surface)',
                opacity: isCurrentMonth ? 1 : 0.3,
              }}
            >
              <div
                className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1"
                style={{
                  background: isToday ? 'var(--brand-500, #6366f1)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--ink-2)',
                }}
              >
                {isCurrentMonth ? dayNum : ''}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] px-1" style={{ color: 'var(--ink-3)' }}>+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week grid ───────────────────────────────────────── */

function WeekGrid({ weekStart, events, onEventClick }: {
  weekStart: Date; events: CalEvent[]; onEventClick: (e: CalEvent) => void;
}) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--edge)' }}>
      {days.map((d) => {
        const isToday = isSameDay(d, today);
        const dayEvents = events.filter((e) => isSameDay(e.date, d));
        return (
          <div key={d.toISOString()} className="min-h-[200px] p-2" style={{ background: 'var(--surface)' }}>
            <div
              className="text-xs font-semibold mb-2 flex items-center gap-1"
              style={{ color: isToday ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)' }}
            >
              <span>{WEEKDAYS[d.getDay()]}</span>
              <span
                className="w-5 h-5 flex items-center justify-center rounded-full text-[11px]"
                style={{ background: isToday ? 'var(--brand-500, #6366f1)' : 'transparent', color: isToday ? '#fff' : 'inherit' }}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.map((e) => <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Day view ────────────────────────────────────────── */

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
                <div className="text-xs mt-0.5" style={{ color: c.color + 'aa' }}>
                  {e.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {e.kind === 'task' ? 'Tarefa' : 'Atividade'}
                  {e.completed && ' · Concluído'}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

export default function Calendario() {
  const today = new Date();
  const [view, setView] = useState<CalView>('month');
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  // Date range for fetching
  const { from, to } = useMemo(() => {
    if (view === 'month') {
      const f = new Date(current.getFullYear(), current.getMonth(), 1);
      const t = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
      return { from: f.toISOString(), to: t.toISOString() };
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      return { from: ws.toISOString(), to: addDays(ws, 6).toISOString() };
    }
    const d = selectedDay ?? current;
    return { from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(), to: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString() };
  }, [view, current, selectedDay]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['calendar-tasks', from, to],
    queryFn: () => listTasks({ dueFrom: from.slice(0, 10), dueTo: to.slice(0, 10) }),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['calendar-activities', from, to],
    queryFn: () => listAllActivities(from, to),
  });

  const events = useMemo<CalEvent[]>(() => {
    const taskEvents: CalEvent[] = tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: t.id,
        kind: 'task',
        title: t.description,
        date: new Date(t.dueDate!),
        type: t.type,
        completed: t.status === 'done',
        raw: t,
      }));

    const actEvents: CalEvent[] = activities
      .filter((a) => a.scheduledAt)
      .map((a) => ({
        id: a.id,
        kind: 'activity',
        title: a.body.length > 60 ? a.body.slice(0, 60) + '…' : a.body,
        date: new Date(a.scheduledAt!),
        type: a.type,
        completed: !!a.completedAt,
        raw: a,
      }));

    return [...taskEvents, ...actEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, activities]);

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') {
      setCurrent(new Date(current.getFullYear(), current.getMonth() + dir, 1));
    } else if (view === 'week') {
      setCurrent(addDays(current, dir * 7));
    } else {
      setSelectedDay(addDays(selectedDay ?? current, dir));
    }
  };

  const title = useMemo(() => {
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
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

  const pendingCount = events.filter((e) => !e.completed).length;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>Calendário</h1>
          {pendingCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
            >
              {pendingCount} pendentes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
            {(['month', 'week', 'day'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: view === v ? 'var(--brand-500, #6366f1)' : 'transparent',
                  color: view === v ? '#fff' : 'var(--ink-2)',
                }}
              >
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav + current period */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setCurrent(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-hover)]"
          style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
        >
          Hoje
        </button>
        <button
          onClick={() => navigate(1)}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          style={{ border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</h2>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ink-3)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: '#ede9fe', border: '1px solid #a78bfa' }} />
          Tarefas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: '#dbeafe', border: '1px solid #93c5fd' }} />
          Atividades agendadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }} />
          Concluídos
        </span>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--edge)' }}>
        {view === 'month' && (
          <MonthGrid
            year={current.getFullYear()}
            month={current.getMonth()}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={setSelectedEvent}
          />
        )}
        {view === 'week' && (
          <>
            <div className="grid grid-cols-7 px-0" style={{ borderBottom: '1px solid var(--edge)' }}>
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide py-2" style={{ color: 'var(--ink-3)' }}>{d}</div>
              ))}
            </div>
            <WeekGrid weekStart={startOfWeek(current)} events={events} onEventClick={setSelectedEvent} />
          </>
        )}
        {view === 'day' && (
          <DayView day={selectedDay ?? current} events={events} onEventClick={setSelectedEvent} />
        )}
      </div>

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
