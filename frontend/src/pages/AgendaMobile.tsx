import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Clock, Phone, Mail, MessageCircle,
  FileText, Users, MapPin, LogOut, CalendarDays,
} from 'lucide-react';
import { listTasks, completeTask } from '@/api/tasks';
import { useAuthStore } from '@/store/auth.store';
import type { Task, TaskType } from '@/types/api';

/* ── Types ─────────────────────────────────────── */

type Tab = 'today' | 'tomorrow' | 'week';

/* ── Constants ─────────────────────────────────── */

const TYPE_ICON: Record<TaskType, React.ElementType> = {
  call: Phone, email: Mail, whatsapp: MessageCircle,
  proposal: FileText, meeting: Users, visit: MapPin,
};

const TYPE_LABEL: Record<TaskType, string> = {
  call: 'Ligação', email: 'E-mail', whatsapp: 'WhatsApp',
  proposal: 'Proposta', meeting: 'Reunião', visit: 'Visita',
};

const TYPE_STYLE: Record<TaskType, { bg: string; color: string }> = {
  call:     { bg: '#dcfce7', color: '#15803d' },
  email:    { bg: '#dbeafe', color: '#1d4ed8' },
  whatsapp: { bg: '#d1fae5', color: '#065f46' },
  proposal: { bg: '#e0e7ff', color: '#4338ca' },
  meeting:  { bg: '#fef3c7', color: '#b45309' },
  visit:    { bg: '#ede9fe', color: '#7c3aed' },
};

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH   = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/* ── Helpers ───────────────────────────────────── */

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = toLocalDateStr(new Date());
  const tomorrow = toLocalDateStr(new Date(Date.now() + 86_400_000));
  if (dateStr === today) return 'Hoje';
  if (dateStr === tomorrow) return 'Amanhã';
  return `${WEEKDAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

function getDueDateStr(task: Task): string | null {
  if (!task.dueDate) return null;
  return task.dueDate.slice(0, 10);
}

/* ── Task Card ─────────────────────────────────── */

function TaskCard({
  task, onComplete, completing,
}: {
  task: Task;
  onComplete?: () => void;
  completing?: boolean;
}) {
  const Icon = TYPE_ICON[task.type] ?? Clock;
  const style = TYPE_STYLE[task.type] ?? { bg: '#f1f5f9', color: '#475569' };
  const isDone = task.status === 'completed';

  return (
    <div
      className="rounded-xl p-4 flex gap-3 transition-opacity"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--edge)',
        opacity: isDone ? 0.55 : 1,
      }}
    >
      {/* Type icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: style.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: style.color }} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold leading-snug"
          style={{
            color: 'var(--ink-1)',
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.description}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {TYPE_LABEL[task.type]}
          </span>
          {task.targetLabel && (
            <span className="text-xs truncate" style={{ color: 'var(--ink-2)' }}>
              {task.targetLabel}
            </span>
          )}
          {task.dueDate && (
            <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--ink-3)' }}>
              <Clock className="w-3 h-3" />
              {fmtTime(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Complete button */}
      {!isDone && onComplete && (
        <button
          onClick={onComplete}
          disabled={completing}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          style={{ background: '#dcfce7' }}
          aria-label="Concluir tarefa"
        >
          <CheckCircle2 className="w-5 h-5" style={{ color: '#15803d' }} />
        </button>
      )}
    </div>
  );
}

/* ── Day Group (for week view) ──────────────────── */

function DayGroup({
  dateStr, tasks, onComplete, completing,
}: {
  dateStr: string;
  tasks: Task[];
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  return (
    <div>
      <p
        className="text-xs font-bold uppercase tracking-widest mb-2 mt-4 first:mt-0"
        style={{ color: 'var(--ink-3)' }}
      >
        {fmtDayHeader(dateStr)}
      </p>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onComplete={() => onComplete(t.id)}
            completing={completing}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────── */

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'var(--surface)' }}
      >
        <CalendarDays className="w-8 h-8" style={{ color: 'var(--ink-3)' }} />
      </div>
      <p className="font-semibold" style={{ color: 'var(--ink-2)' }}>
        {tab === 'today' ? 'Nenhuma tarefa para hoje' :
         tab === 'tomorrow' ? 'Nenhuma tarefa para amanhã' :
         'Nenhuma tarefa essa semana'}
      </p>
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        Você está em dia!
      </p>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────── */

export default function AgendaMobile() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('today');

  const today    = toLocalDateStr(new Date());
  const tomorrow = toLocalDateStr(new Date(Date.now() + 86_400_000));
  const nextWeek = toLocalDateStr(new Date(Date.now() + 6 * 86_400_000));

  const params = useMemo(() => ({
    assigneeId: user?.id,
    dueFrom: tab === 'tomorrow' ? tomorrow : today,
    dueTo:   tab === 'today'    ? today :
             tab === 'tomorrow' ? tomorrow : nextWeek,
  }), [tab, user?.id, today, tomorrow, nextWeek]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['mobile-tasks', user?.id, tab],
    queryFn: () => listTasks(params),
    staleTime: 60_000,
  });

  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: completeTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobile-tasks'] }),
  });

  const pending   = tasks.filter((t) => t.status === 'pending');
  const pendingCount = pending.length;

  // For week view: group by date
  const byDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of pending) {
      const d = getDueDateStr(t) ?? today;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [pending, today]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'today',    label: 'Hoje' },
    { key: 'tomorrow', label: 'Amanhã' },
    { key: 'week',     label: 'Semana' },
  ];

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--canvas)', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--edge)' }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--brand-500)', color: '#fff' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Olá,</p>
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--ink-1)' }}>
            {user?.name}
          </p>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-lg"
          style={{ color: 'var(--ink-3)' }}
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div
        className="flex sticky z-10"
        style={{ top: 57, background: 'var(--surface)', borderBottom: '1px solid var(--edge)' }}
      >
        {TABS.map(({ key, label }) => {
          const count = tab === key ? pendingCount : 0;
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
              style={{
                color: isActive ? 'var(--brand-500)' : 'var(--ink-3)',
                borderBottom: isActive ? '2px solid var(--brand-500)' : '2px solid transparent',
              }}
            >
              {label}
              {isActive && count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: 'var(--brand-500)', color: '#fff' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-10">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-4 flex gap-3 animate-pulse"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
              >
                <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'var(--edge-strong)' }} />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-3/4 rounded" style={{ background: 'var(--edge-strong)' }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: 'var(--edge)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : pendingCount === 0 ? (
          <EmptyState tab={tab} />
        ) : tab === 'week' ? (
          <div className="space-y-4">
            {byDay.map(([dateStr, dayTasks]) => (
              <DayGroup
                key={dateStr}
                dateStr={dateStr}
                tasks={dayTasks}
                onComplete={(id) => complete(id)}
                completing={completing}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onComplete={() => complete(t.id)}
                completing={completing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
