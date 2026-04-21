import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import OptionsListTab from './OptionsListTab';
import {
  listLossReasons,
  createLossReason,
  updateLossReason,
  deleteLossReason,
  type LossReason,
} from '@/api/loss-reasons';
import { listAllLeads, updateLeadStatus } from '@/api/leads';
import type { Lead } from '@/types/api';

export default function MotivosPerdaTab() {
  return (
    <div className="space-y-10">
      <OptionsListTab<LossReason>
        title="Motivos de perda"
        subtitle="Configure os motivos de perda para classificar negócios não fechados e entender melhor onde seu processo comercial pode ser aprimorado."
        queryKey={['loss-reasons']}
        list={listLossReasons}
        create={createLossReason}
        update={updateLossReason}
        remove={deleteLossReason}
        nameOf={(r) => r.label}
        addModalTitle="Adicionar motivos de perda"
        addModalHint="Insira os nomes separados por vírgula, como no exemplo: Preço, Concorrente, Sem interesse."
        confirmDeleteMessage={(n) => `Excluir o motivo "${n}"?`}
      />

      <LostLeadsSection />
    </div>
  );
}

function LostLeadsSection() {
  const qc = useQueryClient();
  const [justifying, setJustifying] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: listAllLeads,
  });

  const lostLeads = useMemo(
    () =>
      leads
        .filter((l) => l.status === 'lost' && !l.archivedAt)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [leads],
  );

  const pendingCount = lostLeads.filter((l) => !l.lossReason?.trim()).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-1)' }}>
          Negócios perdidos
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
          Quando um negócio é marcado como perda, ele aparece aqui. Justifique o motivo para registrar
          o porquê do negócio não ter dado certo.
          {pendingCount > 0 && (
            <span className="ml-1 font-medium" style={{ color: '#b45309' }}>
              {pendingCount} aguardando justificativa.
            </span>
          )}
        </p>
      </div>

      <div
        className="grid items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide"
        style={{
          gridTemplateColumns: '1fr 160px 200px 140px',
          color: 'var(--ink-2)',
          borderBottom: '1px solid var(--edge-strong, var(--edge))',
        }}
      >
        <div>Negócio</div>
        <div>Funil</div>
        <div>Motivo</div>
        <div />
      </div>

      {isLoading ? (
        <div className="text-sm py-6 text-center" style={{ color: 'var(--ink-3)' }}>
          Carregando...
        </div>
      ) : lostLeads.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>
          Nenhum negócio perdido por enquanto.
        </div>
      ) : (
        <div>
          {lostLeads.map((lead) => {
            const title = lead.title || lead.contact?.name || lead.externalName || 'Sem título';
            const reason = lead.lossReason?.trim();
            return (
              <div
                key={lead.id}
                className="grid items-center gap-3 px-4 py-3"
                style={{
                  gridTemplateColumns: '1fr 160px 200px 140px',
                  borderBottom: '1px solid var(--edge)',
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm truncate" style={{ color: 'var(--ink-1)' }}>{title}</div>
                  {lead.contact?.name && lead.title && (
                    <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
                      {lead.contact.name}
                    </div>
                  )}
                </div>
                <div className="text-sm truncate" style={{ color: 'var(--ink-2)' }}>
                  {lead.pipeline?.name ?? '—'}
                </div>
                <div className="min-w-0">
                  {reason ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: '#dcfce7', color: '#166534' }}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="truncate max-w-[160px]">{reason}</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: '#fef3c7', color: '#854d0e' }}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Justificar
                    </span>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setJustifying(lead)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    style={{
                      background: reason ? 'var(--surface)' : 'var(--brand-500, #6366f1)',
                      color: reason ? 'var(--ink-2)' : '#fff',
                      border: reason ? '1px solid var(--edge)' : 'none',
                    }}
                  >
                    {reason ? 'Alterar' : 'Justificar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {justifying && (
        <JustifyModal
          lead={justifying}
          onClose={() => setJustifying(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['leads', 'all'] });
            qc.invalidateQueries({ queryKey: ['negocios'] });
            qc.invalidateQueries({ queryKey: ['leads'] });
            setJustifying(null);
          }}
        />
      )}
    </div>
  );
}

function JustifyModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState(lead.lossReason ?? '');
  const { data: reasons = [] } = useQuery({ queryKey: ['loss-reasons'], queryFn: listLossReasons });

  const mutation = useMutation({
    mutationFn: (r: string) => updateLeadStatus(lead.id, 'lost', r),
    onSuccess: () => onSaved(),
  });

  const title = lead.title || lead.contact?.name || lead.externalName || 'Sem título';
  const canSave = reason.trim().length > 0 && !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30, 27, 75, 0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl max-w-md w-full animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface-raised)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--ink-1)' }}>
            Justificar perda
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div
            className="px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--ink-2)' }}
          >
            <div className="font-medium" style={{ color: 'var(--ink-1)' }}>{title}</div>
            {lead.pipeline?.name && <div className="mt-0.5">{lead.pipeline.name}</div>}
          </div>

          {reasons.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--ink-2)' }}>
                Selecione um motivo cadastrado
              </div>
              <div className="flex flex-wrap gap-2">
                {reasons.map((r) => {
                  const active = reason === r.label;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setReason(r.label)}
                      className="px-2.5 py-1 rounded-full text-xs border transition-colors"
                      style={{
                        background: active ? '#fee2e2' : 'var(--surface)',
                        borderColor: active ? '#dc2626' : 'var(--edge)',
                        color: active ? '#991b1b' : 'var(--ink-2)',
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>
              Ou descreva o motivo
            </div>
            <input
              autoFocus
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave) mutation.mutate(reason.trim());
              }}
              placeholder="Digite o motivo da perda..."
              className="w-full px-3 py-2 rounded-lg outline-none text-sm"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--edge)',
                color: 'var(--ink-1)',
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--ink-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => canSave && mutation.mutate(reason.trim())}
              disabled={!canSave}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--brand-500, #6366f1)' }}
            >
              {mutation.isPending ? 'Salvando...' : 'Registrar motivo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
