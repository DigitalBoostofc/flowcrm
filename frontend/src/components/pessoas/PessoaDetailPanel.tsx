import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Star, Link2, MoreHorizontal, Plus, Mail, Phone, MessageSquare,
  FileText, PhoneCall, Users as UsersIcon, Briefcase, MapPin, Pencil,
  Facebook, Linkedin, Instagram, Twitter,
} from 'lucide-react';
import type { Contact, User } from '@/types/api';
import { updateContact } from '@/api/contacts';
import Avatar from '@/components/ui/Avatar';
import { getContactActivities, createContactActivity, completeContactActivity, deleteContactActivity } from '@/api/contact-activities';
import { ActivityComposer, ActivityFeedList } from '@/components/ui/ActivityFeed';

/* ── Inline editable field ───────────────────────────── */

function InlineField({
  label, value, placeholder = 'Adicionar', onSave, type = 'text',
}: {
  label: string;
  value?: string | number | null;
  placeholder?: string;
  onSave: (v: string) => Promise<void> | void;
  type?: 'text' | 'email' | 'tel' | 'number';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value != null ? String(value) : ''); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = async () => {
    if (draft !== (value != null ? String(value) : '')) {
      await onSave(draft.trim());
    }
    setEditing(false);
  };

  return (
    <div className="grid items-center gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
      <div className="text-sm" style={{ color: 'var(--ink-2)' }}>{label}</div>
      {editing ? (
        <input
          ref={ref}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(value != null ? String(value) : ''); setEditing(false); }
          }}
          className="px-2 py-1 rounded text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--brand-500, #6366f1)', color: 'var(--ink-1)' }}
        />
      ) : value ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm truncate"
          style={{ color: 'var(--ink-1)' }}
        >
          {value}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm font-medium"
          style={{ color: 'var(--brand-500, #6366f1)' }}
        >
          {placeholder}
        </button>
      )}
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────── */

export interface PessoaDetailPanelProps {
  contact: Contact;
  currentUser: User | null;
  users: User[];
  onClose: () => void;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function PessoaDetailPanel({ contact, currentUser, users, onClose }: PessoaDetailPanelProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'historico' | 'negocios'>('historico');

  const responsavel = useMemo(
    () => users.find((u) => u.id === contact.responsibleId) ?? null,
    [users, contact.responsibleId],
  );

  const { data: activities = [] } = useQuery({
    queryKey: ['contact-activities', contact.id],
    queryFn: () => getContactActivities(contact.id),
  });

  const updateMut = useMutation({
    mutationFn: (patch: Record<string, any>) => updateContact(contact.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const save = (field: string) => async (v: string) => {
    await updateMut.mutateAsync({ [field]: v || undefined });
  };

  const saveNumber = (field: string) => async (v: string) => {
    await updateMut.mutateAsync({ [field]: v ? Number(v) : undefined });
  };

  const createActivityMut = useMutation({
    mutationFn: ({ type, body, scheduledAt }: { type: string; body: string; scheduledAt?: string }) =>
      createContactActivity(contact.id, { type, body, scheduledAt }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-activities', contact.id] }),
  });

  const completeActivityMut = useMutation({
    mutationFn: (id: string) => completeContactActivity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-activities', contact.id] }),
  });

  const deleteActivityMut = useMutation({
    mutationFn: (id: string) => deleteContactActivity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-activities', contact.id] }),
  });

  const address = useMemo(() => {
    const parts = [contact.rua, contact.numero, contact.bairro, contact.cidade, contact.estado]
      .filter(Boolean);
    return parts.join(', ');
  }, [contact]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-raised rounded-xl shadow-2xl w-full my-4 animate-fade-up"
        style={{ maxWidth: '1100px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface-raised)', borderRadius: '12px 12px 0 0' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Avatar name={contact.name} url={contact.avatarUrl} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg truncate" style={{ color: 'var(--ink-1)' }}>{contact.name}</h2>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
                  <Link2 className="w-3 h-3" />
                  {contact.company ? (
                    <span>{contact.company}</span>
                  ) : (
                    <span style={{ color: 'var(--ink-3)' }}>Nenhuma empresa relacionada</span>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs mt-1" style={{ color: 'var(--brand-500, #6366f1)' }}>
                  {!contact.categoria && <button>Adicionar categoria</button>}
                  {!contact.categoria && <span style={{ color: 'var(--ink-3)' }}>·</span>}
                  {!contact.whatsapp && <button>Adicionar whatsapp</button>}
                  {!contact.whatsapp && <span style={{ color: 'var(--ink-3)' }}>·</span>}
                  {!contact.email && <button>Adicionar email</button>}
                  {!contact.email && <span style={{ color: 'var(--ink-3)' }}>·</span>}
                  {responsavel && (
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                      <Avatar name={responsavel.name} url={responsavel.avatarUrl} size={18} />
                      {responsavel.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--brand-500, #6366f1)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar negócio
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                Mais opções
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--ink-2)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-3 -mb-4">
            {([
              { k: 'historico', label: 'Ver histórico' },
              { k: 'negocios',  label: 'Ver negócios' },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="px-4 py-2 text-sm font-medium relative"
                style={{ color: tab === t.k ? 'var(--brand-500, #6366f1)' : 'var(--ink-2)' }}
              >
                {t.label}
                {tab === t.k && (
                  <span className="absolute left-0 right-0 -bottom-[1px] h-0.5" style={{ background: 'var(--brand-500, #6366f1)' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body (2-col grid) ── */}
        <div
          className="grid gap-6 p-6"
          style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}
        >
          {/* ── Left column ── */}
          <div className="space-y-4 min-w-0">
            {tab === 'historico' ? (
              <>
                <ActivityComposer
                  isPending={createActivityMut.isPending}
                  onSubmit={(type, body, scheduledAt) =>
                    createActivityMut.mutateAsync({ type, body, scheduledAt })
                  }
                />
                <ActivityFeedList
                  activities={activities}
                  users={users}
                  onComplete={(id) => completeActivityMut.mutate(id)}
                  onDelete={(id) => deleteActivityMut.mutate(id)}
                />
              </>
            ) : (
              <div
                className="py-10 text-center rounded-xl text-sm"
                style={{ background: 'var(--surface)', border: '1px dashed var(--edge)', color: 'var(--ink-3)' }}
              >
                {contact.leads && contact.leads.length > 0
                  ? `${contact.leads.length} negócio(s) vinculado(s).`
                  : 'Nenhum negócio vinculado ainda.'}
              </div>
            )}
          </div>

          {/* ── Right column (sidebar) ── */}
          <aside className="space-y-4">
            {/* Ações */}
            <Section title="Ações">
              <div className="grid grid-cols-2 gap-2">
                <ActionButton icon={Mail} label="Enviar e-mail" primary />
                <ActionButton icon={PhoneCall} label="Fazer ligação" primary />
                <ActionButton icon={MessageSquare} label="Enviar WhatsApp" primary fullWidth />
              </div>
            </Section>

            {/* Dados básicos */}
            <Section title="Dados básicos da pessoa">
              <InlineField label="CPF" value={contact.cpf} onSave={save('cpf')} />
              <InlineField label="Empresa" value={contact.company} onSave={save('company')} />
              <InlineField label="Cargo" value={contact.role} onSave={save('role')} />
              <InlineField label="Aniversário" value={contact.birthDay} onSave={save('birthDay')} />
              <InlineField label="Ano nasc." value={contact.birthYear} onSave={saveNumber('birthYear')} type="number" />
              <div className="grid items-center gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
                <div className="text-sm" style={{ color: 'var(--ink-2)' }}>Responsável</div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ink-1)' }}>
                  {responsavel ? (
                    <>
                      <Avatar name={responsavel.name} url={responsavel.avatarUrl} size={20} />
                      <span className="truncate">
                        {responsavel.id === currentUser?.id ? responsavel.name : responsavel.name}
                      </span>
                    </>
                  ) : (
                    <button className="font-medium" style={{ color: 'var(--brand-500, #6366f1)' }}>Adicionar</button>
                  )}
                </div>
              </div>
              <InlineField label="Categoria" value={contact.categoria} onSave={save('categoria')} />
              <InlineField label="Origem" value={contact.origem} onSave={save('origem')} />
              <InlineField
                label="Descrição"
                value={contact.descricao}
                placeholder="Adicionar descrição"
                onSave={save('descricao')}
              />
            </Section>

            {/* Contato */}
            <Section title="Informações para contato">
              <InlineField label="Email" value={contact.email} onSave={save('email')} type="email" />
              <InlineField label="Celular" value={contact.celular} onSave={save('celular')} type="tel" />
              <InlineField label="WhatsApp" value={contact.whatsapp} onSave={save('whatsapp')} type="tel" />
              <InlineField label="Telefone" value={contact.phone} onSave={save('phone')} type="tel" />
              <div className="grid items-start gap-3 py-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
                <div className="text-sm" style={{ color: 'var(--ink-2)' }}>Endereço</div>
                <div className="text-sm" style={{ color: 'var(--ink-1)' }}>
                  {address || <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  {contact.pais && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{contact.pais}</div>
                  )}
                </div>
              </div>
            </Section>

            {/* Redes sociais */}
            <Section title="Redes Sociais">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" style={{ color: 'var(--ink-2)' }}>
                  <SocialIcon icon={Facebook}  active={!!contact.facebook} />
                  <SocialIcon icon={Twitter}   active={!!contact.twitter} />
                  <SocialIcon icon={Linkedin}  active={!!contact.linkedin} />
                  <SocialIcon icon={Briefcase} active={!!contact.skype} />
                  <SocialIcon icon={Instagram} active={!!contact.instagram} />
                </div>
                <button
                  className="p-1.5 rounded-md"
                  style={{ background: 'var(--surface-hover)', color: 'var(--ink-2)' }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </Section>

            {/* Metadata */}
            <div className="text-xs space-y-1 pt-2" style={{ color: 'var(--ink-3)' }}>
              <div>· Criado em {fmt(contact.createdAt)}</div>
              <div>· Última atualização em {fmt(contact.updatedAt)}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink-1)' }}>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function ActionButton({
  icon: Icon, label, primary, fullWidth,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${fullWidth ? 'col-span-2' : ''}`}
      style={{
        background: primary ? 'var(--brand-500, #6366f1)' : 'var(--surface)',
        color: primary ? '#fff' : 'var(--ink-1)',
        border: primary ? 'none' : '1px solid var(--edge)',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function SocialIcon({
  icon: Icon, active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{
        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: active ? 'var(--brand-500, #6366f1)' : 'var(--ink-3)',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}
