import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Phone, User, Building2, X } from 'lucide-react';
import { useQualificationStore } from '@/store/qualification.store';
import { updateContact } from '@/api/contacts';
import { moveLead } from '@/api/leads';
import { listPipelines } from '@/api/pipelines';
import { usePanelStore } from '@/store/panel.store';

type ContactType = 'pessoa' | 'empresa';

export default function QualificationModal() {
  const { queue, dismiss } = useQualificationStore();
  const item = queue[0];

  if (!item) return null;

  return <QualificationForm key={item.id} item={item} onClose={() => dismiss(item.id)} />;
}

function QualificationForm({ item, onClose }: { item: NonNullable<ReturnType<typeof useQualificationStore.getState>['queue'][0]>; onClose: () => void }) {
  const qc = useQueryClient();
  const openPanel = usePanelStore((s) => s.open);

  const [name, setName] = useState(item.lead.contact?.name ?? '');
  const [type, setType] = useState<ContactType>('pessoa');
  const [company, setCompany] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages?.sort((a, b) => a.position - b.position) ?? [];

  const saveMut = useMutation({
    mutationFn: async () => {
      await updateContact(item.lead.contact!.id, {
        name,
        categoria: type === 'empresa' ? 'empresa' : 'pessoa',
        company: type === 'empresa' ? company : undefined,
      });
      if (selectedStageId && selectedStageId !== item.lead.stageId) {
        await moveLead(item.lead.id, selectedStageId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
      openPanel(item.lead.id);
    },
  });

  const phone = item.lead.contact?.phone ?? '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--surface-raised)', border: '1px solid var(--edge)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--edge)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <MessageCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Nova conversa no WhatsApp</p>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Qualifique o contato para continuar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)]" style={{ color: 'var(--ink-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagem recebida */}
        <div className="px-5 py-3 mx-5 mt-4 rounded-xl text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Phone className="w-3 h-3" style={{ color: 'var(--ink-3)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>{phone}</span>
          </div>
          <p className="line-clamp-2" style={{ color: 'var(--ink-2)' }}>"{item.message.body}"</p>
        </div>

        {/* Formulário */}
        <div className="px-5 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Nome do contato</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Tipo de contato</label>
            <div className="grid grid-cols-2 gap-2">
              {(['pessoa', 'empresa'] as ContactType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: type === t ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
                    border: `1px solid ${type === t ? 'rgba(99,102,241,0.5)' : 'var(--edge)'}`,
                    color: type === t ? 'var(--brand-400, #818cf8)' : 'var(--ink-2)',
                  }}
                >
                  {t === 'pessoa' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {t === 'pessoa' ? 'Pessoa' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>

          {/* Empresa (se tipo = empresa) */}
          {type === 'empresa' && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Nome da empresa</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Razão social ou nome fantasia"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              />
            </div>
          )}

          {/* Pipeline e Etapa */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Funil</label>
              <select
                value={selectedPipelineId}
                onChange={(e) => { setSelectedPipelineId(e.target.value); setSelectedStageId(''); }}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              >
                <option value="">Manter atual</option>
                {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Etapa</label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                disabled={!selectedPipelineId}
                className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-1)' }}
              >
                <option value="">Selecione...</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
          >
            Depois
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!name || saveMut.isPending}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--brand-500, #6366f1)' }}
          >
            {saveMut.isPending ? 'Salvando...' : 'Qualificar e abrir'}
          </button>
        </div>
      </div>
    </div>
  );
}
