import { useState } from 'react';
import {
  StickyNote, PhoneCall, MessageSquare, FileText,
  Users as UsersIcon, MapPin, Mail, Clock, Check, X,
  Plus, UserCheck, Building2, User as UserIcon,
} from 'lucide-react';

export interface Activity {
  id: string;
  type: string;
  body: string;
  createdById?: string;
  createdBy?: { id: string; name: string };
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

interface User { id: string; name: string }

const TYPE_META: Record<string, { label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  note:     { label: 'Nota',     Icon: StickyNote },
  email:    { label: 'E-mail',   Icon: Mail },
  call:     { label: 'Ligação',  Icon: PhoneCall },
  whatsapp: { label: 'WhatsApp', Icon: MessageSquare },
  proposal: { label: 'Proposta', Icon: FileText },
  meeting:  { label: 'Reunião',  Icon: UsersIcon },
  visit:    { label: 'Visita',   Icon: MapPin },
};

const ACTIVITY_TABS = Object.entries(TYPE_META).map(([key, v]) => ({ key, ...v }));

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ── Composer ─────────────────────────────────────────── */

interface ComposerProps {
  onSubmit: (type: string, body: string, scheduledAt?: string) => Promise<unknown>;
  isPending: boolean;
}

export function ActivityComposer({ onSubmit, isPending }: ComposerProps) {
  const [type, setType] = useState('note');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    await onSubmit(type, trimmed, scheduledAt || undefined);
    setBody('');
    setScheduledAt('');
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--edge)' }}>
      {/* Type tabs */}
      <div className="flex items-center gap-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--edge)' }}>
        <button
          onClick={() => setType('note')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
          style={{
            color: type === 'note' ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
            borderBottom: type === 'note' ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
          }}
        >
          <StickyNote className="w-3.5 h-3.5" /> Nota
        </button>
        {ACTIVITY_TABS.filter(t => t.key !== 'note').map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
            style={{
              color: type === key ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)',
              borderBottom: type === key ? '2px solid var(--brand-500, #6366f1)' : '2px solid transparent',
            }}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Descreva a atividade..."
          rows={3}
          className="w-full px-2 py-2 rounded-md outline-none text-sm resize-none"
          style={{ background: 'transparent', color: 'var(--ink-1)' }}
        />
        <div className="flex items-center gap-2 mt-2">
          {type !== 'note' && (
            <div className="flex items-center gap-1.5 flex-1">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-xs outline-none bg-transparent flex-1"
                style={{ color: 'var(--ink-2)' }}
              />
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || isPending}
            className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            {isPending ? 'Enviando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Activity item ────────────────────────────────────── */

interface ActivityItemProps {
  activity: Activity;
  users: User[];
  onComplete: () => void;
  onDelete: () => void;
}

export function ActivityItem({ activity, users, onComplete, onDelete }: ActivityItemProps) {
  const author = users.find(u => u.id === activity.createdById) ?? activity.createdBy ?? null;
  const meta = TYPE_META[activity.type] ?? TYPE_META['note'];
  const { Icon } = meta;
  const isScheduled = !!activity.scheduledAt && !activity.completedAt;
  const isCompleted = !!activity.completedAt;
  const isOverdue = isScheduled && new Date(activity.scheduledAt!) < new Date();

  return (
    <div
      className="p-3 rounded-lg"
      style={{
        border: `1px solid ${isOverdue ? '#fca5a5' : 'var(--edge)'}`,
        opacity: isCompleted ? 0.7 : 1,
        background: 'var(--surface)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--surface-hover)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--ink-2)' }} />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--ink-1)' }}>{meta.label}</span>
        {author && <span className="text-xs" style={{ color: 'var(--ink-3)' }}>• {author.name}</span>}
        <span className="text-xs ml-auto" style={{ color: 'var(--ink-3)' }}>{fmt(activity.createdAt)}</span>
        <button onClick={onDelete} className="p-0.5 rounded hover:bg-[var(--surface-hover)]" style={{ color: 'var(--ink-3)' }} title="Excluir">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink-1)' }}>{activity.body}</div>

      {(isScheduled || isCompleted) && (
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--edge)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: isOverdue ? '#ef4444' : 'var(--ink-3)' }}>
            <Clock className="w-3 h-3" />
            {isCompleted
              ? `Finalizada em ${fmt(activity.completedAt!)}`
              : `Agendada para ${fmt(activity.scheduledAt!)}`}
          </div>
          {isScheduled && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
            >
              <Check className="w-3 h-3" /> Finalizar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── System events ────────────────────────────────────── */

export type SystemEventIcon = 'plus' | 'user' | 'building' | 'assign';

export interface SystemEvent {
  icon: SystemEventIcon;
  label: string;
  date: string;
}

const SYSTEM_ICONS: Record<SystemEventIcon, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  plus:     Plus,
  user:     UserIcon,
  building: Building2,
  assign:   UserCheck,
};

function SystemEventItem({ event }: { event: SystemEvent }) {
  const Icon = SYSTEM_ICONS[event.icon];
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
      >
        <Icon className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
      </div>
      <span className="text-xs flex-1" style={{ color: 'var(--ink-3)' }}>{event.label}</span>
      <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{fmt(event.date)}</span>
    </div>
  );
}

/* ── Feed list ────────────────────────────────────────── */

interface FeedProps {
  activities: Activity[];
  users: User[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  systemEvents?: SystemEvent[];
}

export function ActivityFeedList({ activities, users, onComplete, onDelete, systemEvents = [] }: FeedProps) {
  const hasContent = activities.length > 0 || systemEvents.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <StickyNote className="w-8 h-8" style={{ color: 'var(--ink-3)' }} />
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <ActivityItem
          key={a.id}
          activity={a}
          users={users}
          onComplete={() => onComplete(a.id)}
          onDelete={() => onDelete(a.id)}
        />
      ))}
      {systemEvents.length > 0 && (
        <div
          className="rounded-lg px-3 py-1"
          style={{ border: '1px solid var(--edge)', background: 'var(--surface)' }}
        >
          {systemEvents.map((ev, i) => (
            <div key={i}>
              <SystemEventItem event={ev} />
              {i < systemEvents.length - 1 && (
                <div style={{ height: 1, background: 'var(--edge)', margin: '0 0 0 36px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
