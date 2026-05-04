import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Phone, MessageSquare, Users, MapPin, FileCheck,
  Clock, User as UserIcon, X, Check, CheckCircle2, Paperclip,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { listTasks, createTask } from '@/api/tasks';
import { getLeadActivities } from '@/api/lead-activities';
import { getLead } from '@/api/leads';
import { listUsers } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import type { ActivityType, Task } from '@/types/api';

interface Props {
  leadId: string;
}

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'note',     label: 'Nota',     icon: FileText,  color: 'text-slate-300' },
  { type: 'call',     label: 'Ligação',  icon: Phone,     color: 'text-blue-400' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  { type: 'meeting',  label: 'Reunião',  icon: Users,     color: 'text-purple-400' },
  { type: 'visit',    label: 'Visita',   icon: MapPin,    color: 'text-orange-400' },
  { type: 'proposal', label: 'Proposta', icon: FileCheck, color: 'text-yellow-400' },
];

const TYPE_COLOR: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.type, t.color]),
);
const TYPE_ICON: Record<string, React.ElementType> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.type, t.icon]),
);
const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.type, t.label]),
);

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function LeadActivities({ leadId }: Props) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [activeType, setActiveType] = useState<ActivityType>('note');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [responsibleIds, setResponsibleIds] = useState<string[]>(
    currentUser ? [currentUser.id] : [],
  );
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: lead } = useQuery({ queryKey: ['lead', leadId], queryFn: () => getLead(leadId), staleTime: 60_000 });

  const { data: legacyActivities = [] } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => getLeadActivities(leadId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', { targetId: leadId }],
    queryFn: () => listTasks({ targetType: 'lead', targetId: leadId }),
  });

  const timeline = useMemo(() => {
    const taskEntries = tasks.map((t: Task) => ({
      id: t.id,
      type: t.type as string,
      body: t.description,
      location: t.location,
      dueDate: t.dueDate,
      status: t.status,
      createdAt: t.createdAt,
      kind: 'task' as const,
    }));
    const actEntries = legacyActivities.map((a: any) => ({
      id: a.id,
      type: a.type as string,
      body: a.body,
      location: null,
      dueDate: null,
      status: null,
      createdAt: a.createdAt,
      kind: 'activity' as const,
    }));
    return [...taskEntries, ...actEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [tasks, legacyActivities]);

  const mutation = useMutation({
    mutationFn: () => {
      const iso = date && time ? new Date(`${date}T${time}:00`).toISOString() : null;
      const targetLabel = lead?.contact?.name ?? lead?.company?.name ?? lead?.externalName ?? undefined;
      return createTask({
        type: activeType as any,
        description: description.trim(),
        dueDate: iso,
        responsibleIds,
        targetType: 'lead',
        targetId: leadId,
        targetLabel,
        location: activeType === 'visit' ? location.trim() || undefined : undefined,
        attachments,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks', { targetId: leadId }] });
      setDescription('');
      setLocation('');
      setAttachments([]);
    },
  });

  const toggleResponsible = (id: string) =>
    setResponsibleIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const selectedUsers = users.filter((u) => responsibleIds.includes(u.id));
  const canSave = description.trim().length > 0;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachments((a) => [...a, ...Array.from(files).map((f) => ({ name: f.name, url: '' }))]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Type selector */}
      <div className="flex gap-1 px-4 pt-3 flex-wrap">
        {ACTIVITY_TYPES.map(({ type, label, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeType === type ? 'bg-slate-700 ' + color : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="px-4 pt-3 pb-3 border-b border-slate-700/50 space-y-3">
        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Registrar ${TYPE_LABEL[activeType]?.toLowerCase() ?? activeType}...`}
          rows={2}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
        />

        {/* Endereço — apenas para Visita */}
        {activeType === 'visit' && (
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Endereço da visita (rua, número, cidade...)"
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        )}

        {/* Responsáveis + Data + Hora */}
        <div className="grid grid-cols-3 gap-2">
          {/* Responsáveis */}
          <div className="relative col-span-1">
            <div
              onClick={() => setResponsibleOpen((o) => !o)}
              className="flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer min-h-[34px] bg-slate-700/50 border border-slate-600"
            >
              {selectedUsers.length === 0 && (
                <span className="text-xs text-slate-500">Responsáveis</span>
              )}
              {selectedUsers.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] bg-slate-600 text-slate-200">
                  {u.id === currentUser?.id ? 'Eu' : u.name}
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleResponsible(u.id); }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            {responsibleOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg shadow-lg max-h-40 overflow-y-auto bg-slate-800 border border-slate-600">
                {users.map((u) => {
                  const sel = responsibleIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleResponsible(u.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-700 text-slate-200"
                    >
                      {sel ? <Check className="w-3 h-3 text-brand-400" /> : <span className="w-3 h-3" />}
                      {u.id === currentUser?.id ? `Eu (${u.name})` : u.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Data */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2 py-1.5 rounded-lg outline-none text-xs bg-slate-700/50 border border-slate-600 text-slate-200"
          />

          {/* Hora */}
          <div className="relative">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-2 py-1.5 pr-6 rounded-lg outline-none text-xs bg-slate-700/50 border border-slate-600 text-slate-200"
            />
            {time && (
              <button
                type="button"
                onClick={() => setTime('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Footer da form */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
          >
            <Paperclip className="w-3.5 h-3.5" />
            Anexo {attachments.length > 0 && `(${attachments.length})`}
          </button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFile} />

          <button
            type="button"
            disabled={!canSave || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-lg"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {timeline.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-6">Nenhuma atividade registrada.</p>
        )}
        {timeline.map((entry) => {
          const Icon = TYPE_ICON[entry.type] ?? FileText;
          const colorClass = TYPE_COLOR[entry.type] ?? 'text-slate-300';
          const label = TYPE_LABEL[entry.type] ?? entry.type;
          return (
            <div key={entry.id} className="flex gap-3">
              <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
                  {entry.kind === 'task' && entry.status === 'completed' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  )}
                  <span className="text-xs text-slate-600">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                  {entry.dueDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.dueDate)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{entry.body}</p>
                {entry.location && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {entry.location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
