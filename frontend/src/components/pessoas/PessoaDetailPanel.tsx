import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Mail, Phone, MessageSquare, Globe, MapPin, User as UserIcon } from 'lucide-react';
import type { Contact, User } from '@/types/api';
import Avatar from '@/components/ui/Avatar';
import { ActivityComposer, ActivityFeedList, type SystemEvent } from '@/components/ui/ActivityFeed';
import { getContactActivities, createContactActivity, completeContactActivity, deleteContactActivity } from '@/api/contact-activities';

interface Props {
  contact: Contact;
  currentUser: User | null;
  users: User[];
  onClose: () => void;
  onEdit?: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm" style={{ borderBottom: '1px solid var(--edge)' }}>
      <span className="w-28 flex-shrink-0 text-xs" style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span className="flex-1 break-words" style={{ color: 'var(--ink-1)' }}>{value}</span>
    </div>
  );
}

export interface PessoaDetailPanelProps {
  contact: Contact;
  currentUser: User | null;
  users: User[];
  onClose: () => void;
  onEdit?: () => void;
}

export default function PessoaDetailPanel({ contact, users, onClose, onEdit }: PessoaDetailPanelProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'historico' | 'info'>('historico');

  const responsible = users.find(u => u.id === contact.responsibleId) ?? null;

  const { data: activities = [] } = useQuery({
    queryKey: ['contact-activities', contact.id],
    queryFn: () => getContactActivities(contact.id),
  });

  const createMut = useMutation({
    mutationFn: (data: { type: string; body: string; scheduledAt?: string }) =>
      createContactActivity(contact.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-activities', contact.id] }),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => completeContactActivity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-activities', contact.id] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContactActivity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-activities', contact.id] }),
  });

  const address = [contact.rua, contact.numero, contact.bairro, contact.cidade, contact.estado]
    .filter(Boolean).join(', ');

  const whatsapp = contact.whatsapp || contact.celular;

  const systemEvents: SystemEvent[] = [
    ...(responsible ? [{ icon: 'assign' as const, label: `Responsável assumiu — ${responsible.name}`, date: contact.createdAt }] : []),
    { icon: 'user' as const, label: 'Pessoa criada', date: contact.createdAt },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl my-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-raised, var(--surface))', border: '1px solid var(--edge-strong)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--edge)' }}>
          <Avatar name={contact.name} url={contact.avatarUrl} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate" style={{ color: 'var(--ink-1)' }}>{contact.name}</div>
            {(contact.role || contact.company) && (
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {[contact.role, contact.company].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
            >
              Editar
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--surface-hover)]" style={{ color: 'var(--ink-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6" style={{ borderBottom: '1px solid var(--edge)' }}>
          {([
            { k: 'historico', label: 'Histórico' },
            { k: 'info', label: 'Informações' },
          ] as const).map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="py-3 text-sm font-medium relative"
              style={{ color: tab === t.k ? 'var(--ink-1)' : 'var(--ink-2)' }}
            >
              {t.label}
              {tab === t.k && <span className="absolute left-0 right-0 -bottom-[1px] h-0.5" style={{ background: 'var(--brand-500, #6366f1)' }} />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="grid gap-6 p-6" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
          {/* Left */}
          <div className="space-y-4 min-w-0">
            {tab === 'historico' ? (
              <>
                <ActivityComposer
                  isPending={createMut.isPending}
                  onSubmit={(type, body, scheduledAt) => createMut.mutateAsync({ type, body, scheduledAt })}
                />
                <ActivityFeedList
                  activities={activities}
                  users={users}
                  onComplete={id => completeMut.mutate(id)}
                  onDelete={id => deleteMut.mutate(id)}
                  systemEvents={systemEvents}
                />
              </>
            ) : (
              <div className="space-y-1">
                <InfoRow label="CPF" value={contact.cpf} />
                <InfoRow label="Empresa" value={contact.company} />
                <InfoRow label="Cargo" value={contact.role} />
                <InfoRow label="Categoria" value={contact.categoria} />
                <InfoRow label="Origem" value={contact.origem} />
                <InfoRow label="Aniversário" value={contact.birthDay} />
                <InfoRow label="Descrição" value={contact.descricao} />
                <InfoRow label="Endereço" value={address || undefined} />
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-4">
            {/* Quick actions */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Ações rápidas</div>
              <div className="grid grid-cols-2 gap-2">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--surface-hover)] transition-colors" style={{ color: 'var(--ink-1)', border: '1px solid var(--edge)' }}>
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </a>
                )}
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--surface-hover)] transition-colors" style={{ color: 'var(--ink-1)', border: '1px solid var(--edge)' }}>
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--surface-hover)] transition-colors" style={{ color: 'var(--ink-1)', border: '1px solid var(--edge)' }}>
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Contato</div>
              {contact.email && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-2)' }}><Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{contact.email}</span></div>}
              {(contact.celular || contact.whatsapp) && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-2)' }}><MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />{contact.celular || contact.whatsapp}</div>}
              {contact.phone && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-2)' }}><Phone className="w-3.5 h-3.5 flex-shrink-0" />{contact.phone}</div>}
              {address && <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-2)' }}><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{address}</span></div>}
            </div>

            {/* Responsible */}
            {responsible && (
              <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Responsável</div>
                <div className="flex items-center gap-2">
                  <Avatar name={responsible.name} url={responsible.avatarUrl} size={24} />
                  <span className="text-sm" style={{ color: 'var(--ink-1)' }}>{responsible.name}</span>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="text-xs space-y-1" style={{ color: 'var(--ink-3)' }}>
              <div className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Pessoa criada em {new Date(contact.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
