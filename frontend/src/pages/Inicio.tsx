import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Phone, MessageCircle, FileText, MapPin, Users as UsersIcon,
  Pencil, Trash2, Building2, User as UserIcon, DollarSign,
  ChevronDown, CheckCircle2, X, Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { listTasks, completeTask, reopenTask, deleteTask } from '@/api/tasks';
import { listUsers } from '@/api/users';
import { createContact, listContacts } from '@/api/contacts';
import { createCompany } from '@/api/companies';
import { createLead } from '@/api/leads';
import { listPipelines } from '@/api/pipelines';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Task, TaskType, User } from '@/types/api';

const TYPE_META: Record<TaskType, { label: string; icon: typeof Mail; title: string }> = {
  email:    { label: 'E-mail',   icon: Mail,          title: 'Enviar email' },
  call:     { label: 'Ligação',  icon: Phone,         title: 'Fazer ligação' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, title: 'Enviar WhatsApp' },
  proposal: { label: 'Proposta', icon: FileText,      title: 'Enviar proposta' },
  meeting:  { label: 'Reunião',  icon: UsersIcon,     title: 'Agendar reunião' },
  visit:    { label: 'Visita',   icon: MapPin,        title: 'Agendar visita' },
};

const AVATAR_COLORS = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#f97316', '#0ea5e9',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 3).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function Avatar({ name, id, size = 36 }: { name: string; id: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.32 }}
    >
      {initials(name) || '?'}
    </div>
  );
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDueLabel(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month.charAt(0).toUpperCase() + month.slice(1)} às ${hh}:${mm}`;
}

function formatRelative(iso: string | null) {
  if (!iso) return '';
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = t - now;
  const absDays = Math.round(Math.abs(diff) / 86400000);
  const abshours = Math.round(Math.abs(diff) / 3600000);
  if (diff > 0) {
    if (absDays >= 1) return `em ${absDays} dia${absDays > 1 ? 's' : ''}`;
    return `em ${abshours} h`;
  }
  if (absDays >= 1) return `há ${absDays} dia${absDays > 1 ? 's' : ''}`;
  return `há ${abshours} h`;
}

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `Hoje às ${hh}:${mm}`;
  if (isYesterday) return `Ontem às ${hh}:${mm}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') + ` às ${hh}:${mm}`;
}

function TypeFilterDropdown({
  value, onChange,
}: { value: TaskType | 'all'; onChange: (v: TaskType | 'all') => void }) {
  const [open, setOpen] = useState(false);
  const active = value !== 'all' ? TYPE_META[value] : null;
  const ActiveIcon = active?.icon;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)', minWidth: 72 }}
        title="Filtrar por tipo"
      >
        {ActiveIcon ? <ActiveIcon className="w-4 h-4" /> : <span className="w-4 h-4" />}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-20 min-w-[180px] py-1"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
          >
            <button
              onClick={() => { onChange('all'); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] text-left"
              style={{ color: 'var(--ink-1)', fontWeight: value === 'all' ? 600 : 400 }}
            >
              Todos os tipos
            </button>
            {(Object.keys(TYPE_META) as TaskType[]).map((k) => {
              const Icon = TYPE_META[k].icon;
              return (
                <button
                  key={k}
                  onClick={() => { onChange(k); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] text-left"
                  style={{ color: 'var(--ink-1)', fontWeight: value === k ? 600 : 400 }}
                >
                  <Icon className="w-4 h-4" /> {TYPE_META[k].label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityCard({
  task, users,
}: {
  task: Task;
  users: User[];
}) {
  const qc = useQueryClient();
  const meta = TYPE_META[task.type];
  const Icon = meta.icon;

  const completeMut = useMutation({
    mutationFn: () => (task.status === 'completed' ? reopenTask(task.id) : completeTask(task.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inicio-tasks'] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inicio-tasks'] }),
  });

  const creator = task.createdById ? users.find((u) => u.id === task.createdById) : null;
  const responsibles = task.responsibleIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => !!u);

  const onDelete = () => {
    if (confirm(`Excluir esta atividade?`)) deleteMut.mutate();
  };

  const completed = task.status === 'completed';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--edge)' }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--ink-1)' }} />
        <div
          className="text-sm font-bold uppercase tracking-wide flex-shrink-0"
          style={{ color: 'var(--ink-1)' }}
        >
          {meta.title}
        </div>
        <div className="flex-1 flex items-baseline gap-2 ml-4 text-sm">
          <span style={{ color: 'var(--ink-2)' }}>Prazo:</span>
          <span style={{ color: 'var(--brand-500, #6366f1)', fontWeight: 500 }}>
            {formatDueLabel(task.dueDate)}
          </span>
          {task.dueDate && (
            <span className="text-xs italic" style={{ color: 'var(--ink-3)' }}>
              ({formatRelative(task.dueDate)})
            </span>
          )}
        </div>
        <button
          onClick={() => completeMut.mutate()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          style={{ border: '1px solid var(--edge)', color: completed ? 'var(--ink-3)' : '#16a34a' }}
          title={completed ? 'Reabrir' : 'Finalizar'}
        >
          <span
            className="w-4 h-4 rounded flex items-center justify-center"
            style={{ border: `1.5px solid ${completed ? '#16a34a' : 'var(--edge-strong, var(--edge))'}`, background: completed ? '#16a34a' : 'transparent' }}
          >
            {completed && <CheckCircle2 className="w-3 h-3 text-white" />}
          </span>
          {completed ? 'Finalizada' : 'Finalizar'}
        </button>
        <button
          className="p-2 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
          style={{ border: '1px solid var(--edge)', color: 'var(--brand-500, #6366f1)' }}
          title="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-500"
          style={{ border: '1px solid var(--edge)', color: 'var(--brand-500, #6366f1)' }}
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Sub row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {creator ? (
          <>
            <Avatar name={creator.name} id={creator.id} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
                {creator.name}
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {formatCreatedAt(task.createdAt)}
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {formatCreatedAt(task.createdAt)}
          </div>
        )}

        <div className="flex-1" />

        {responsibles.map((r) => (
          <div key={r.id} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--brand-500, #6366f1)' }}>
            <UserIcon className="w-4 h-4" />
            <span>{r.name}</span>
          </div>
        ))}
      </div>

      {/* Description */}
      {task.description && (
        <div
          className="px-4 py-3 text-sm"
          style={{ borderTop: '1px solid var(--edge)', color: 'var(--ink-2)' }}
        >
          {task.description}
        </div>
      )}
    </div>
  );
}

function SidebarActionButton({
  icon: Icon, label, variant = 'solid',
}: { icon: typeof Building2; label: string; variant?: 'solid' | 'ghost' }) {
  const isSolid = variant === 'solid';
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all"
      style={
        isSolid
          ? { background: 'var(--brand-500, #6366f1)', color: '#fff' }
          : { background: 'var(--surface-raised)', color: 'var(--brand-500, #6366f1)', border: '1px solid var(--edge)' }
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

type TypeFilter = TaskType | 'all';

function TrialBanner() {
  const { data: ws } = useWorkspace();
  if (!ws || ws.subscriptionStatus !== 'trial') return null;
  const daysLeft = ws.trialDaysLeft;
  const urgent = daysLeft <= 3;
  return (
    <Link
      to="/assinar"
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-4 transition-all hover:shadow-md"
      style={{
        background: urgent
          ? 'linear-gradient(135deg, rgba(229,72,77,0.08) 0%, rgba(229,72,77,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(99,91,255,0.08) 0%, rgba(99,91,255,0.04) 100%)',
        border: `1px solid ${urgent ? 'rgba(229,72,77,0.25)' : 'rgba(99,91,255,0.25)'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: urgent
              ? 'linear-gradient(135deg, #F0585D 0%, #D94448 100%)'
              : 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
          }}
        >
          <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={2} />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
            {daysLeft > 0
              ? `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} de trial`
              : 'Seu trial termina hoje'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Assine um plano para continuar com todos os dados e recursos.
          </div>
        </div>
      </div>
      <span
        className="text-sm font-medium px-3.5 py-1.5 rounded-lg text-white whitespace-nowrap"
        style={{
          background: urgent
            ? 'linear-gradient(135deg, #F0585D 0%, #D94448 100%)'
            : 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
        }}
      >
        Assinar →
      </span>
    </Link>
  );
}

export default function Inicio() {
  const currentUser = useAuthStore((s) => s.user);

  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return toISODate(d);
  }, [today]);
  const defaultEnd = useMemo(() => toISODate(today), [today]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [from, setFrom] = useState(defaultStart);
  const [to, setTo] = useState(defaultEnd);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['inicio-tasks', typeFilter, from, to, currentUser?.id],
    queryFn: () => listTasks({
      type: typeFilter === 'all' ? undefined : typeFilter,
      dueFrom: from ? `${from}T00:00:00.000Z` : undefined,
      dueTo: to ? `${to}T23:59:59.999Z` : undefined,
    }),
  });

  const visibleTasks = useMemo(() => {
    if (!currentUser) return tasks;
    return tasks.filter((t) => {
      if (t.createdById === currentUser.id) return true;
      if (t.responsibleIds.includes(currentUser.id)) return true;
      return false;
    });
  }, [tasks, currentUser]);

  const count = visibleTasks.length;

  return (
    <div className="p-6">
      <TrialBanner />
      <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px' }}>
        {/* Main column */}
        <div className="space-y-4">
          {/* Header bar */}
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold" style={{ color: 'var(--brand-500, #6366f1)' }}>
                {count}
              </span>
              <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-1)' }}>
                atividade{count !== 1 ? 's' : ''}.
              </span>
            </div>

            <TypeFilterDropdown value={typeFilter} onChange={setTypeFilter} />

            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--ink-3)' }}>até</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div
              className="rounded-xl px-6 py-10 text-center text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-3)' }}
            >
              Carregando...
            </div>
          ) : visibleTasks.length === 0 ? (
            <div
              className="rounded-xl px-6 py-16 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--ink-1)' }}>
                Nenhuma atividade no período
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                Mude o filtro de tipo ou o intervalo de datas para ver mais resultados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTasks.map((t) => (
                <ActivityCard key={t.id} task={t} users={users} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-3">
          <SidebarActionButton icon={Building2} label="Adicionar uma empresa" />
          <SidebarActionButton icon={UserIcon} label="Adicionar uma pessoa" />
          <SidebarActionButton icon={DollarSign} label="Adicionar um negócio" />
        </aside>
      </div>
    </div>
  );
}
