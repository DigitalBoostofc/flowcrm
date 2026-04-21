import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Phone, MessageCircle, FileText, MapPin, Users, CheckCircle2,
  Plus, X, Paperclip, Clock, User as UserIcon, Check, ChevronDown,
} from 'lucide-react';
import {
  listTasks, createTask, completeTask, reopenTask, deleteTask,
} from '@/api/tasks';
import { listUsers } from '@/api/users';
import { listContacts } from '@/api/contacts';
import { useAuthStore } from '@/store/auth.store';
import type { Task, TaskType, TaskStatus, User } from '@/types/api';

/* ── Type config ─────────────────────────────────────── */

const TASK_TYPES: { key: TaskType; label: string; icon: typeof Mail }[] = [
  { key: 'email',    label: 'E-mail',   icon: Mail },
  { key: 'call',     label: 'Ligação',  icon: Phone },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'proposal', label: 'Proposta', icon: FileText },
  { key: 'meeting',  label: 'Reunião',  icon: Users },
  { key: 'visit',    label: 'Visita',   icon: MapPin },
];

const TYPE_MAP: Record<TaskType, { label: string; icon: typeof Mail }> = Object.fromEntries(
  TASK_TYPES.map((t) => [t.key, { label: t.label, icon: t.icon }]),
) as Record<TaskType, { label: string; icon: typeof Mail }>;

type RangeFilter = 'all' | 'today' | 'week' | 'custom';

/* ── Small helpers ───────────────────────────────────── */

function IconButton({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        background: active ? 'var(--brand-50, rgba(99,91,255,0.12))' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--brand-500, #6366f1)' : 'var(--edge)'}`,
        color: active ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
      }}
    >
      {children}
    </button>
  );
}

function SegmentedButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
      style={{
        background: active ? 'var(--brand-500, #6366f1)' : 'transparent',
        color: active ? '#fff' : 'var(--ink-2)',
      }}
    >
      {children}
    </button>
  );
}

function formatTaskDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Add Task expandable card ────────────────────────── */

function AddTaskCard({
  onClose, currentUser,
}: { onClose: () => void; currentUser: User | null }) {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<TaskType>('email');
  const [description, setDescription] = useState('');
  const [responsibleIds, setResponsibleIds] = useState<string[]>(
    currentUser ? [currentUser.id] : [],
  );
  const [targetSearch, setTargetSearch] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetLabel, setTargetLabel] = useState('');
  const [targetOpen, setTargetOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: contactsData = [] } = useQuery({
    queryKey: ['contacts', targetSearch],
    queryFn: () => listContacts(targetSearch || undefined),
    enabled: targetOpen,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const iso = date && time ? new Date(`${date}T${time}:00`).toISOString() : null;
      return createTask({
        type: selectedType,
        description: description.trim(),
        dueDate: iso,
        responsibleIds,
        targetType: targetId ? 'contact' : undefined,
        targetId: targetId ?? undefined,
        targetLabel: targetLabel || undefined,
        attachments,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files).map((f) => ({ name: f.name, url: '' }));
    setAttachments((a) => [...a, ...list]);
  };

  const toggleResponsible = (id: string) => {
    setResponsibleIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const selectedUsers = users.filter((u) => responsibleIds.includes(u.id));

  const canSave = description.trim().length > 0 && responsibleIds.length > 0;

  return (
    <div
      className="rounded-xl overflow-hidden animate-fade-up"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--edge)',
      }}
    >
      {/* Type selector row */}
      <div
        className="flex items-center gap-1 px-4 py-2 overflow-x-auto"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--edge)' }}
      >
        {TASK_TYPES.map(({ key, label, icon: Icon }) => {
          const active = selectedType === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap"
              style={{
                color: active ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
                background: active ? 'var(--surface-raised)' : 'transparent',
                border: active ? '1px solid var(--edge-strong)' : '1px solid transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Description textarea */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--edge)' }}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="O que foi feito e qual o próximo passo?"
          className="w-full resize-none bg-transparent outline-none text-sm"
          style={{ color: 'var(--ink-1)' }}
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            + Modelos
          </button>
        </div>
      </div>

      {/* Fields row */}
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Responsáveis */}
        <div className="relative">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Responsáveis
          </label>
          <div
            onClick={() => setResponsibleOpen((o) => !o)}
            className="flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer min-h-[38px]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--brand-500, #6366f1)',
            }}
          >
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: '#1f2937', color: '#fff' }}
              >
                {u.id === currentUser?.id ? `Eu (${u.name})` : u.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleResponsible(u.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {responsibleOpen && (
            <div
              className="absolute z-20 mt-1 w-full rounded-lg shadow-lg max-h-48 overflow-y-auto"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
            >
              {users.map((u) => {
                const sel = responsibleIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleResponsible(u.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-1)' }}
                  >
                    {sel ? (
                      <Check className="w-4 h-4" style={{ color: 'var(--brand-500, #6366f1)' }} />
                    ) : (
                      <span className="w-4 h-4" />
                    )}
                    {u.id === currentUser?.id ? `Eu (${u.name})` : u.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Onde será criada */}
        <div className="relative">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Onde será criada?
          </label>
          <input
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            onFocus={() => setTargetOpen(true)}
            placeholder="Empresa, pessoa ou negócio"
            className="w-full px-2 py-1.5 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
              height: '38px',
            }}
          />
          {targetOpen && targetSearch && (
            <div
              className="absolute z-20 mt-1 w-full rounded-lg shadow-lg max-h-48 overflow-y-auto"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
            >
              {contactsData.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setTargetId(c.id);
                    setTargetLabel(c.name);
                    setTargetSearch(c.name);
                    setTargetOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--ink-1)' }}
                >
                  <UserIcon className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
                  <span>{c.name}</span>
                </button>
              ))}
              {contactsData.length === 0 && (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--ink-3)' }}>
                  Nenhum resultado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Prazo
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--edge)',
              color: 'var(--ink-1)',
              height: '38px',
            }}
          />
        </div>

        {/* Horário */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-2)' }}>
            Horário
          </label>
          <div className="relative">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-2 py-1.5 pr-8 rounded-lg outline-none text-sm"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
                height: '38px',
              }}
            />
            {time && (
              <button
                type="button"
                onClick={() => setTime('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--brand-500, #6366f1)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: '1px solid var(--edge)' }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
        >
          <Paperclip className="w-4 h-4" />
          Adicionar anexo
          {attachments.length > 0 && (
            <span
              className="ml-1 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--brand-500, #6366f1)', color: '#fff' }}
            >
              {attachments.length}
            </span>
          )}
        </button>
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFile} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium"
            style={{ color: 'var(--brand-500, #6366f1)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Task row ────────────────────────────────────────── */

function TaskRow({ task, users }: { task: Task; users: User[] }) {
  const qc = useQueryClient();
  const Icon = TYPE_MAP[task.type].icon;
  const typeLabel = TYPE_MAP[task.type].label;
  const responsibles = users.filter((u) => task.responsibleIds.includes(u.id));

  const completeMut = useMutation({
    mutationFn: () => (task.status === 'completed' ? reopenTask(task.id) : completeTask(task.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const completed = task.status === 'completed';

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <button
        onClick={() => completeMut.mutate()}
        className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          border: `2px solid ${completed ? 'var(--brand-500, #6366f1)' : 'var(--edge-strong)'}`,
          background: completed ? 'var(--brand-500, #6366f1)' : 'transparent',
        }}
      >
        {completed && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
            {typeLabel}
          </span>
          {task.targetLabel && (
            <>
              <span style={{ color: 'var(--ink-3)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{task.targetLabel}</span>
            </>
          )}
        </div>
        <p
          className={`text-sm ${completed ? 'line-through' : ''}`}
          style={{ color: completed ? 'var(--ink-3)' : 'var(--ink-1)' }}
        >
          {task.description}
        </p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            <Clock className="w-3 h-3" />
            {formatTaskDate(task.dueDate)}
          </span>
          {responsibles.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
              style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}
            >
              <UserIcon className="w-3 h-3" />
              {r.name}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          if (confirm('Excluir tarefa?')) deleteMut.mutate();
        }}
        className="p-1.5 rounded hover:bg-red-500/10 flex-shrink-0"
        style={{ color: 'var(--ink-3)' }}
        title="Excluir"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

export default function Tasks() {
  const user = useAuthStore((s) => s.user);
  const [typeFilters, setTypeFilters] = useState<Set<TaskType>>(new Set());
  const [statusFilter, setStatusFilter] = useState<TaskStatus>('pending');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [addingOpen, setAddingOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const queryKey = ['tasks', { status: statusFilter, range: rangeFilter, assigneeId: assigneeFilter }];

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listTasks({
      status: statusFilter,
      assigneeId: assigneeFilter || undefined,
      range: rangeFilter === 'custom' ? 'all' : rangeFilter,
    }),
  });

  const tasks = useMemo(
    () => (typeFilters.size === 0 ? allTasks : allTasks.filter((t) => typeFilters.has(t.type))),
    [allTasks, typeFilters],
  );

  const toggleType = (key: TaskType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedAssignee = users.find((u) => u.id === assigneeFilter);

  const counterText = useMemo(() => {
    if (statusFilter === 'pending') {
      return `${tasks.length} ${tasks.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'}`;
    }
    return `${tasks.length} ${tasks.length === 1 ? 'tarefa finalizada' : 'tarefas finalizadas'}`;
  }, [tasks.length, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="page-title">Tarefas</h1>

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-4 p-3 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        {/* Type icons */}
        <div className="flex items-center gap-1.5">
          {TASK_TYPES.map(({ key, label, icon: Icon }) => (
            <IconButton
              key={key}
              active={typeFilters.has(key)}
              onClick={() => toggleType(key)}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </IconButton>
          ))}
          <IconButton
            active={typeFilters.size === 0}
            onClick={() => setTypeFilters(new Set())}
            title="Todas"
          >
            <CheckCircle2 className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="w-px h-6" style={{ background: 'var(--edge)' }} />

        {/* Status toggle */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg"
          style={{ background: 'var(--surface-hover)' }}
        >
          <SegmentedButton active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>
            Pendentes
          </SegmentedButton>
          <SegmentedButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>
            Finalizadas
          </SegmentedButton>
        </div>

        <div className="w-px h-6" style={{ background: 'var(--edge)' }} />

        {/* Range */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg"
          style={{ background: 'var(--surface-hover)' }}
        >
          <SegmentedButton active={rangeFilter === 'all'}    onClick={() => setRangeFilter('all')}>Todas</SegmentedButton>
          <SegmentedButton active={rangeFilter === 'today'}  onClick={() => setRangeFilter('today')}>Hoje</SegmentedButton>
          <SegmentedButton active={rangeFilter === 'week'}   onClick={() => setRangeFilter('week')}>Esta semana</SegmentedButton>
          <SegmentedButton active={rangeFilter === 'custom'} onClick={() => setRangeFilter('custom')}>Definir</SegmentedButton>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setAddingOpen((o) => !o)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'var(--brand-500, #6366f1)' }}
        >
          <Plus className="w-4 h-4" />
          Adicionar tarefa
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
            {counterText} por
          </span>
          <div className="relative">
            <button
              onClick={() => setAssigneeOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm min-w-[160px]"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--brand-500, #6366f1)',
                color: 'var(--ink-1)',
              }}
            >
              <UserIcon className="w-4 h-4" />
              <span className="flex-1 text-left">{selectedAssignee?.name ?? 'Todos'}</span>
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
            </button>
            {assigneeOpen && (
              <div
                className="absolute right-0 z-20 mt-1 w-[200px] rounded-lg shadow-lg max-h-64 overflow-y-auto"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}
              >
                <button
                  onClick={() => { setAssigneeFilter(''); setAssigneeOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--ink-1)' }}
                >
                  Todos
                </button>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setAssigneeFilter(u.id); setAssigneeOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--ink-1)' }}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add task expandable */}
      {addingOpen && (
        <AddTaskCard onClose={() => setAddingOpen(false)} currentUser={user} />
      )}

      {/* Task list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--ink-3)' }}>
            Carregando...
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px dashed var(--edge)', color: 'var(--ink-3)' }}
          >
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {statusFilter === 'pending'
                ? 'Nenhuma tarefa pendente'
                : 'Nenhuma tarefa finalizada'}
            </p>
          </div>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} users={users} />)
        )}
      </div>
    </div>
  );
}
