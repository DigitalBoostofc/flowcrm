import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit2, Check, X, Archive, ArchiveRestore, RefreshCw, Sparkles,
  Briefcase, User as UserIcon, Loader2, Save,
} from 'lucide-react';
import { getLead, updateLead, moveLead, archiveLead, unarchiveLead, setLeadScore, recalculateLeadScore } from '@/api/leads';
import { getContact, updateContact } from '@/api/contacts';
import { getCompany, updateCompany } from '@/api/companies';
import { listPipelines } from '@/api/pipelines';
import { listWorkspaceMembers } from '@/api/users';
import { listCustomerOrigins } from '@/api/customer-origins';
import StatusToggle from './StatusToggle';
import { maskCep, fetchViaCep } from '@/lib/cep';
import type { Lead, Contact, Company, Pipeline } from '@/types/api';

/* ── Shared primitives ─────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid var(--panel-border)' }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  placeholder,
  type = 'text',
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="text-sm text-left w-full flex items-center gap-1 group"
        style={{ color: 'var(--ink-1)' }}
      >
        <span style={!value ? { color: 'var(--ink-3)', fontStyle: 'italic' } : {}}>
          {value || placeholder || '—'}
        </span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-40 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSave(draft); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="flex-1 px-2 py-1 rounded-md text-sm focus:outline-none"
        style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--ink-1)' }}
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="p-1 rounded text-emerald-500">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: 'var(--ink-3)' }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function InlineSelect({
  value,
  options,
  onSave,
  placeholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const label = options.find((o) => o.value === value)?.label;

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="text-sm text-left w-full flex items-center gap-1 group"
        style={{ color: 'var(--ink-1)' }}
      >
        <span style={!label ? { color: 'var(--ink-3)', fontStyle: 'italic' } : {}}>
          {label || placeholder || '—'}
        </span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-40 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="flex-1 px-2 py-1 rounded-md text-sm focus:outline-none"
        style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--ink-1)' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button onClick={() => { onSave(draft); setEditing(false); }} className="p-1 rounded text-emerald-500">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: 'var(--ink-3)' }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Form field components (for contact/company) ────────── */

function FInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
      />
    </div>
  );
}

function FTextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
      />
    </div>
  );
}

function FSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-3)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider pt-2 pb-1" style={{ color: 'var(--ink-3)' }}>
      {children}
    </div>
  );
}

/* ── Negócio Tab ───────────────────────────────────────── */

function NegocioTab({ leadId }: { leadId: string }) {
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId),
  });

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: listPipelines,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
  });

  const { data: origins = [] } = useQuery({
    queryKey: ['customer-origins'],
    queryFn: listCustomerOrigins,
  });

  const mut = useMutation({
    mutationFn: (data: Parameters<typeof updateLead>[1]) => updateLead(leadId, data),
    onSuccess: (updated) => {
      qc.setQueryData<Lead>(['lead', leadId], updated);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const archiveMut = useMutation({
    mutationFn: () => lead?.archivedAt ? unarchiveLead(leadId) : archiveLead(leadId),
    onSuccess: (updated) => {
      qc.setQueryData<Lead>(['lead', leadId], updated);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const scoreMut = useMutation({
    mutationFn: (score: number) => setLeadScore(leadId, score),
    onSuccess: (updated) => { qc.setQueryData<Lead>(['lead', leadId], updated); },
  });

  const recalcMut = useMutation({
    mutationFn: () => recalculateLeadScore(leadId),
    onSuccess: ({ lead: updated }) => { qc.setQueryData<Lead>(['lead', leadId], updated); },
  });

  if (isLoading || !lead) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
      </div>
    );
  }

  const selectedPipeline = pipelines.find((p) => p.id === lead.pipelineId) ?? null;
  const stages = (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position);

  const pipelineOptions = pipelines.map((p) => ({ value: p.id, label: p.name }));
  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));
  const originOptions = origins.map((o) => ({ value: o.id, label: o.name }));

  return (
    <div className="px-4 pb-4">
      {/* Status */}
      <div className="py-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <FieldLabel>Status</FieldLabel>
        <StatusToggle lead={lead} />
        {lead.status === 'lost' && lead.lossReason && (
          <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>Motivo: {lead.lossReason}</p>
        )}
        {lead.status === 'frozen' && (
          <div className="mt-1.5 space-y-0.5">
            {lead.freezeReason && <p className="text-xs" style={{ color: '#0284c7' }}>❄ {lead.freezeReason}</p>}
            {lead.frozenReturnDate && (
              <p className="text-xs" style={{ color: '#0284c7' }}>
                ↩ Retorno: {new Date(lead.frozenReturnDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <FieldRow label="Título do negócio">
        <InlineEdit
          value={lead.title ?? ''}
          placeholder={lead.contact?.name ?? lead.company?.name ?? 'Sem título'}
          onSave={(v) => mut.mutate({ title: v || undefined })}
        />
      </FieldRow>

      {/* Funil */}
      <FieldRow label="Funil">
        <InlineSelect
          value={lead.pipelineId}
          options={pipelineOptions}
          placeholder="Selecione o funil"
          onSave={(pipelineId) => {
            const pipeline = pipelines.find((p) => p.id === pipelineId);
            const firstStage = (pipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position)[0];
            if (firstStage) {
              moveLead(leadId, firstStage.id).then((updated) => {
                qc.setQueryData<Lead>(['lead', leadId], updated);
                qc.invalidateQueries({ queryKey: ['leads'] });
              });
            }
          }}
        />
      </FieldRow>

      {/* Etapa */}
      <FieldRow label="Etapa">
        <InlineSelect
          value={lead.stageId}
          options={stageOptions}
          placeholder="Selecione a etapa"
          onSave={(stageId) => {
            moveLead(leadId, stageId).then((updated) => {
              qc.setQueryData<Lead>(['lead', leadId], updated);
              qc.invalidateQueries({ queryKey: ['leads'] });
            });
          }}
        />
      </FieldRow>

      {/* Responsável */}
      <FieldRow label="Responsável">
        <InlineSelect
          value={lead.assignedToId ?? ''}
          options={memberOptions}
          placeholder="Sem responsável"
          onSave={(v) => mut.mutate({ assignedToId: v || null })}
        />
      </FieldRow>

      {/* Valor */}
      <FieldRow label="Valor (R$)">
        <InlineEdit
          value={lead.value != null ? String(lead.value) : ''}
          placeholder="0,00"
          type="number"
          onSave={(v) => mut.mutate({ value: v ? parseFloat(v) : null })}
        />
      </FieldRow>

      {/* Datas */}
      <FieldRow label="Data de início">
        <InlineEdit
          value={lead.startDate ?? ''}
          placeholder="AAAA-MM-DD"
          type="date"
          onSave={(v) => mut.mutate({ startDate: v || null })}
        />
      </FieldRow>

      <FieldRow label="Data de conclusão">
        <InlineEdit
          value={lead.conclusionDate ?? ''}
          placeholder="AAAA-MM-DD"
          type="date"
          onSave={(v) => mut.mutate({ conclusionDate: v || null })}
        />
      </FieldRow>

      {/* Origem */}
      <FieldRow label="Origem do cliente">
        <InlineSelect
          value={lead.customerOriginId ?? ''}
          options={originOptions}
          placeholder="Sem origem"
          onSave={(v) => mut.mutate({ customerOriginId: v || null })}
        />
      </FieldRow>

      {/* Notas */}
      <FieldRow label="Notas">
        <InlineEdit
          value={lead.notes ?? ''}
          placeholder="Adicionar notas..."
          onSave={(v) => mut.mutate({ notes: v })}
        />
      </FieldRow>

      {/* Score */}
      <FieldRow label="Score (0–100)">
        <div className="flex items-center gap-2 flex-wrap">
          <InlineEdit
            value={lead.score != null ? String(lead.score) : ''}
            placeholder="0–100"
            type="number"
            onSave={(v) => {
              const n = parseInt(v, 10);
              if (Number.isFinite(n) && n >= 0 && n <= 100) scoreMut.mutate(n);
            }}
          />
          <button
            onClick={() => recalcMut.mutate()}
            disabled={recalcMut.isPending}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border disabled:opacity-50"
            style={{ color: 'var(--ink-3)', borderColor: 'var(--panel-border)' }}
          >
            <RefreshCw className={`w-3 h-3 ${recalcMut.isPending ? 'animate-spin' : ''}`} />
            Recalcular
          </button>
        </div>
      </FieldRow>

      {/* Arquivar */}
      <div className="pt-3">
        <button
          onClick={() => archiveMut.mutate()}
          disabled={archiveMut.isPending}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
          style={
            lead.archivedAt
              ? { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }
              : { color: 'var(--ink-3)', borderColor: 'var(--panel-border)' }
          }
        >
          {lead.archivedAt ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          {lead.archivedAt ? 'Desarquivar negócio' : 'Arquivar negócio'}
        </button>
      </div>
    </div>
  );
}

/* ── Pessoa Tab ────────────────────────────────────────── */

function PessoaTab({ contactId }: { contactId: string }) {
  const qc = useQueryClient();

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => getContact(contactId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
  });

  const [form, setForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (contact) setForm({ ...contact });
  }, [contact]);

  const set = (key: keyof Contact, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCep = async (raw: string) => {
    const masked = maskCep(raw);
    set('zipCode', masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      const data = await fetchViaCep(digits);
      setCepLoading(false);
      if (data) {
        setForm((prev) => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: data.complemento || prev.complemento,
        }));
      }
    }
  };

  const mut = useMutation({
    mutationFn: () => updateContact(contactId, {
      name: form.name,
      phone: form.phone,
      email: form.email,
      whatsapp: form.whatsapp,
      celular: form.celular,
      fax: form.fax,
      ramal: form.ramal,
      cpf: form.cpf,
      birthDay: form.birthDay,
      birthYear: form.birthYear,
      company: form.company,
      role: form.role,
      categoria: form.categoria,
      origem: form.origem,
      descricao: form.descricao,
      website: form.website,
      zipCode: form.zipCode,
      pais: form.pais,
      estado: form.estado,
      cidade: form.cidade,
      bairro: form.bairro,
      rua: form.rua,
      numero: form.numero,
      complemento: form.complemento,
      facebook: form.facebook,
      twitter: form.twitter,
      linkedin: form.linkedin,
      instagram: form.instagram,
      skype: form.skype,
      responsibleId: form.responsibleId,
    }),
    onSuccess: (updated) => {
      qc.setQueryData<Contact>(['contact', contactId], updated);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !contact) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
      </div>
    );
  }

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  return (
    <div className="px-4 pb-6 space-y-3">
      <SectionTitle>Identificação</SectionTitle>
      <FInput label="Nome *" value={form.name ?? ''} onChange={(v) => set('name', v)} />
      <div className="grid grid-cols-2 gap-2">
        <FInput label="CPF" value={form.cpf ?? ''} onChange={(v) => set('cpf', v)} placeholder="000.000.000-00" />
        <FInput label="Data de nascimento" value={form.birthDay ?? ''} onChange={(v) => set('birthDay', v)} placeholder="DD/MM" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Empresa" value={form.company ?? ''} onChange={(v) => set('company', v)} />
        <FInput label="Cargo" value={form.role ?? ''} onChange={(v) => set('role', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Categoria" value={form.categoria ?? ''} onChange={(v) => set('categoria', v)} />
        <FInput label="Origem" value={form.origem ?? ''} onChange={(v) => set('origem', v)} />
      </div>
      <FSelect
        label="Responsável"
        value={form.responsibleId ?? ''}
        onChange={(v) => set('responsibleId', v)}
        options={memberOptions}
        placeholder="Selecione..."
      />
      <FTextarea label="Descrição" value={form.descricao ?? ''} onChange={(v) => set('descricao', v)} />

      <SectionTitle>Contato</SectionTitle>
      <FInput label="Email" value={form.email ?? ''} onChange={(v) => set('email', v)} type="email" />
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Telefone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} />
        <FInput label="WhatsApp" value={form.whatsapp ?? ''} onChange={(v) => set('whatsapp', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Celular" value={form.celular ?? ''} onChange={(v) => set('celular', v)} />
        <FInput label="Fax" value={form.fax ?? ''} onChange={(v) => set('fax', v)} />
      </div>
      <FInput label="Ramal" value={form.ramal ?? ''} onChange={(v) => set('ramal', v)} />
      <FInput label="Site" value={form.website ?? ''} onChange={(v) => set('website', v)} placeholder="https://" />

      <SectionTitle>Endereço</SectionTitle>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FInput
            label={cepLoading ? 'CEP (buscando…)' : 'CEP'}
            value={form.zipCode ?? ''}
            onChange={handleCep}
            placeholder="00000-000"
          />
        </div>
        {cepLoading && <Loader2 className="w-4 h-4 animate-spin mb-2" style={{ color: 'var(--ink-3)' }} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FInput label="Rua" value={form.rua ?? ''} onChange={(v) => set('rua', v)} />
        </div>
        <FInput label="Número" value={form.numero ?? ''} onChange={(v) => set('numero', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Bairro" value={form.bairro ?? ''} onChange={(v) => set('bairro', v)} />
        <FInput label="Complemento" value={form.complemento ?? ''} onChange={(v) => set('complemento', v)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FInput label="Cidade" value={form.cidade ?? ''} onChange={(v) => set('cidade', v)} />
        </div>
        <FInput label="Estado" value={form.estado ?? ''} onChange={(v) => set('estado', v)} placeholder="UF" />
      </div>
      <FInput label="País" value={form.pais ?? ''} onChange={(v) => set('pais', v)} />

      <SectionTitle>Redes sociais</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Instagram" value={form.instagram ?? ''} onChange={(v) => set('instagram', v)} />
        <FInput label="Facebook" value={form.facebook ?? ''} onChange={(v) => set('facebook', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="LinkedIn" value={form.linkedin ?? ''} onChange={(v) => set('linkedin', v)} />
        <FInput label="Twitter / X" value={form.twitter ?? ''} onChange={(v) => set('twitter', v)} />
      </div>
      <FInput label="Skype" value={form.skype ?? ''} onChange={(v) => set('skype', v)} />

      {/* Save button */}
      <div className="pt-2">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: saved ? '#22c55e' : 'var(--brand-500)' }}
        >
          {mut.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
          ) : saved ? (
            <><Check className="w-3.5 h-3.5" /> Salvo!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Salvar alterações</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Empresa Tab ───────────────────────────────────────── */

function EmpresaTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompany(companyId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
  });

  const [form, setForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (company) setForm({ ...company });
  }, [company]);

  const set = (key: keyof Company, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCep = async (raw: string) => {
    const masked = maskCep(raw);
    set('cep', masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      const data = await fetchViaCep(digits);
      setCepLoading(false);
      if (data) {
        setForm((prev) => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: data.complemento || prev.complemento,
        }));
      }
    }
  };

  const mut = useMutation({
    mutationFn: () => updateCompany(companyId, {
      name: form.name ?? company!.name,
      cnpj: form.cnpj,
      razaoSocial: form.razaoSocial,
      email: form.email,
      whatsapp: form.whatsapp,
      telefone: form.telefone,
      celular: form.celular,
      fax: form.fax,
      ramal: form.ramal,
      website: form.website,
      setor: form.setor,
      categoria: form.categoria,
      origem: form.origem,
      descricao: form.descricao,
      responsibleId: form.responsibleId,
      cep: form.cep,
      pais: form.pais,
      estado: form.estado,
      cidade: form.cidade,
      bairro: form.bairro,
      rua: form.rua,
      numero: form.numero,
      complemento: form.complemento,
      facebook: form.facebook,
      twitter: form.twitter,
      linkedin: form.linkedin,
      instagram: form.instagram,
      skype: form.skype,
    }),
    onSuccess: (updated) => {
      qc.setQueryData<Company>(['company', companyId], updated);
      qc.invalidateQueries({ queryKey: ['companies'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !company) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
      </div>
    );
  }

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  return (
    <div className="px-4 pb-6 space-y-3">
      <SectionTitle>Identificação</SectionTitle>
      <FInput label="Nome *" value={form.name ?? ''} onChange={(v) => set('name', v)} />
      <div className="grid grid-cols-2 gap-2">
        <FInput label="CNPJ" value={form.cnpj ?? ''} onChange={(v) => set('cnpj', v)} placeholder="00.000.000/0000-00" />
        <FInput label="Razão Social" value={form.razaoSocial ?? ''} onChange={(v) => set('razaoSocial', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Setor" value={form.setor ?? ''} onChange={(v) => set('setor', v)} />
        <FInput label="Categoria" value={form.categoria ?? ''} onChange={(v) => set('categoria', v)} />
      </div>
      <FInput label="Origem" value={form.origem ?? ''} onChange={(v) => set('origem', v)} />
      <FSelect
        label="Responsável"
        value={form.responsibleId ?? ''}
        onChange={(v) => set('responsibleId', v)}
        options={memberOptions}
        placeholder="Selecione..."
      />
      <FTextarea label="Descrição" value={form.descricao ?? ''} onChange={(v) => set('descricao', v)} />

      <SectionTitle>Contato</SectionTitle>
      <FInput label="Email" value={form.email ?? ''} onChange={(v) => set('email', v)} type="email" />
      <div className="grid grid-cols-2 gap-2">
        <FInput label="WhatsApp" value={form.whatsapp ?? ''} onChange={(v) => set('whatsapp', v)} />
        <FInput label="Telefone" value={form.telefone ?? ''} onChange={(v) => set('telefone', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Celular" value={form.celular ?? ''} onChange={(v) => set('celular', v)} />
        <FInput label="Fax" value={form.fax ?? ''} onChange={(v) => set('fax', v)} />
      </div>
      <FInput label="Ramal" value={form.ramal ?? ''} onChange={(v) => set('ramal', v)} />
      <FInput label="Site" value={form.website ?? ''} onChange={(v) => set('website', v)} placeholder="https://" />

      <SectionTitle>Endereço</SectionTitle>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FInput
            label={cepLoading ? 'CEP (buscando…)' : 'CEP'}
            value={form.cep ?? ''}
            onChange={handleCep}
            placeholder="00000-000"
          />
        </div>
        {cepLoading && <Loader2 className="w-4 h-4 animate-spin mb-2" style={{ color: 'var(--ink-3)' }} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FInput label="Rua" value={form.rua ?? ''} onChange={(v) => set('rua', v)} />
        </div>
        <FInput label="Número" value={form.numero ?? ''} onChange={(v) => set('numero', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Bairro" value={form.bairro ?? ''} onChange={(v) => set('bairro', v)} />
        <FInput label="Complemento" value={form.complemento ?? ''} onChange={(v) => set('complemento', v)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FInput label="Cidade" value={form.cidade ?? ''} onChange={(v) => set('cidade', v)} />
        </div>
        <FInput label="Estado" value={form.estado ?? ''} onChange={(v) => set('estado', v)} placeholder="UF" />
      </div>
      <FInput label="País" value={form.pais ?? ''} onChange={(v) => set('pais', v)} />

      <SectionTitle>Redes sociais</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="Instagram" value={form.instagram ?? ''} onChange={(v) => set('instagram', v)} />
        <FInput label="Facebook" value={form.facebook ?? ''} onChange={(v) => set('facebook', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FInput label="LinkedIn" value={form.linkedin ?? ''} onChange={(v) => set('linkedin', v)} />
        <FInput label="Twitter / X" value={form.twitter ?? ''} onChange={(v) => set('twitter', v)} />
      </div>
      <FInput label="Skype" value={form.skype ?? ''} onChange={(v) => set('skype', v)} />

      {/* Save button */}
      <div className="pt-2">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: saved ? '#22c55e' : 'var(--brand-500)' }}
        >
          {mut.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
          ) : saved ? (
            <><Check className="w-3.5 h-3.5" /> Salvo!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Salvar alterações</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */

interface Props {
  leadId: string;
}

export default function InboxDataTab({ leadId }: Props) {
  const [activeTab, setActiveTab] = useState<'negocio' | 'contato'>('negocio');

  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId),
  });

  const isCompany = !lead?.contactId && !!lead?.companyId;
  const contactLabel = isCompany ? 'Empresa' : 'Pessoa';

  const tabs = [
    { id: 'negocio' as const, label: 'Negócio', icon: Briefcase },
    { id: 'contato' as const, label: contactLabel, icon: isCompany ? Briefcase : UserIcon },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div
        className="flex gap-1 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--edge)', background: 'var(--surface)' }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              activeTab === id
                ? { background: 'var(--panel-bg, var(--canvas))', color: 'var(--ink-1)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                : { color: 'var(--ink-3)' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'negocio' && <NegocioTab leadId={leadId} />}
        {activeTab === 'contato' && lead?.contactId && <PessoaTab contactId={lead.contactId} />}
        {activeTab === 'contato' && lead?.companyId && !lead.contactId && <EmpresaTab companyId={lead.companyId} />}
        {activeTab === 'contato' && !lead?.contactId && !lead?.companyId && (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--ink-3)' }}>
            <UserIcon className="w-8 h-8" strokeWidth={1.5} />
            <p className="text-sm">Nenhum contato vinculado</p>
          </div>
        )}
      </div>
    </div>
  );
}
