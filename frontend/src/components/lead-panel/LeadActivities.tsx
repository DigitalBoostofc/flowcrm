import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Phone, MessageSquare, Users, MapPin, FileCheck, Sparkles, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getLeadActivities, createLeadActivity } from '@/api/lead-activities';
import { getLead } from '@/api/leads';
import { updateContact } from '@/api/contacts';
import { detectSuggestions, type Suggestion } from '@/lib/suggest';
import type { ActivityType } from '@/types/api';

interface Props {
  leadId: string;
}

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'note', label: 'Nota', icon: FileText, color: 'text-slate-300' },
  { type: 'call', label: 'Ligação', icon: Phone, color: 'text-blue-400' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  { type: 'meeting', label: 'Reunião', icon: Users, color: 'text-purple-400' },
  { type: 'visit', label: 'Visita', icon: MapPin, color: 'text-orange-400' },
  { type: 'proposal', label: 'Proposta', icon: FileCheck, color: 'text-yellow-400' },
];

export default function LeadActivities({ leadId }: Props) {
  const qc = useQueryClient();
  const [activeType, setActiveType] = useState<ActivityType>('note');
  const [body, setBody] = useState('');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const { data: lead } = useQuery({ queryKey: ['lead', leadId], queryFn: () => getLead(leadId), staleTime: 60_000 });
  const contactId = lead?.contactId ?? null;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => getLeadActivities(leadId),
  });

  const suggestions = useMemo(() => {
    if (!contactId || body.trim().length < 6) return [];
    return detectSuggestions(body).filter((s) => !dismissedSuggestions.has(s.field + ':' + s.value));
  }, [body, contactId, dismissedSuggestions]);

  const applyMut = useMutation({
    mutationFn: (s: Suggestion) => {
      const patch = s.field === 'phone' ? { phone: s.value } : s.field === 'email' ? { email: s.value } : {};
      return updateContact(contactId!, patch);
    },
    onSuccess: (_, s) => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] });
      setDismissedSuggestions((prev) => new Set([...prev, s.field + ':' + s.value]));
    },
  });

  const dismiss = (s: Suggestion) =>
    setDismissedSuggestions((prev) => new Set([...prev, s.field + ':' + s.value]));

  const mutation = useMutation({
    mutationFn: () => createLeadActivity(leadId, { type: activeType, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      setBody('');
      setDismissedSuggestions(new Set());
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-4 pt-3 flex-wrap">
        {ACTIVITY_TYPES.map(({ type, label, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeType === type
                ? 'bg-slate-700 ' + color
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-3 pb-3 border-b border-slate-700/50">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Registrar ${ACTIVITY_TYPES.find(t => t.type === activeType)?.label.toLowerCase()}...`}
          rows={2}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
        />
        {suggestions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {suggestions.map((s) => (
              <div
                key={s.field + s.value}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#818cf8' }} />
                <span style={{ color: '#c7d2fe' }}>
                  <span className="font-semibold">{s.label}:</span> {s.value}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyMut.mutate(s)}
                    disabled={applyMut.isPending}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold disabled:opacity-50"
                    style={{ background: '#6366f1', color: '#fff' }}
                  >
                    <Check className="w-3 h-3" /> Adicionar
                  </button>
                  <button type="button" onClick={() => dismiss(s)} className="p-0.5 rounded hover:bg-white/10" style={{ color: '#818cf8' }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!body.trim() || mutation.isPending}
            className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-lg"
          >
            Salvar
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {isLoading && <p className="text-slate-500 text-sm">Carregando...</p>}
        {!isLoading && activities.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-6">Nenhuma atividade registrada.</p>
        )}
        {activities.map((a) => {
          const cfg = ACTIVITY_TYPES.find(t => t.type === a.type)!;
          const Icon = cfg.icon;
          return (
            <div key={a.id} className="flex gap-3">
              <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-slate-600">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{a.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
