import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { listPlans, subscribePlan, getFeatureCatalog, type Plan, type FeatureDef } from '@/api/workspace';
import { createCheckoutSession } from '@/api/billing';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuthStore } from '@/store/auth.store';

export default function Assinar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';

  const { data: workspace } = useWorkspace();
  const { data: plans, isLoading } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: catalog = [] } = useQuery({ queryKey: ['features-catalog'], queryFn: getFeatureCatalog });

  const [params] = useSearchParams();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!plans || selectedSlug) return;
    const wanted = params.get('plan');
    if (wanted && plans.some((p) => p.slug === wanted)) {
      setSelectedSlug(wanted);
    } else {
      const highlighted = plans.find((p) => p.highlight);
      if (highlighted) setSelectedSlug(highlighted.slug);
    }
  }, [plans, params, selectedSlug]);

  const subscribeMut = useMutation({
    mutationFn: async (plan: Plan) => {
      if (plan.stripePriceId) {
        const { url } = await createCheckoutSession(plan.slug);
        window.location.href = url;
        return { redirected: true } as const;
      }
      await subscribePlan(plan.slug);
      return { redirected: false } as const;
    },
    onSuccess: (result) => {
      if (result.redirected) return;
      qc.invalidateQueries({ queryKey: ['workspace-me'] });
      qc.invalidateQueries({ queryKey: ['me-features'] });
      setTimeout(() => navigate('/'), 800);
    },
  });

  const blocked = workspace?.isBlocked ?? false;
  const trialDaysLeft = workspace?.trialDaysLeft ?? 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {!blocked && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
            style={{ color: 'var(--ink-3)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        )}

        <header className="text-center mb-10">
          <div
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
              boxShadow: '0 8px 24px rgba(99,91,255,0.35)',
            }}
          >
            <Zap className="w-6 h-6 text-white" fill="white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
            {blocked ? 'Seu trial acabou' : 'Escolha seu plano'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--ink-3)' }}>
            {blocked
              ? 'Assine um plano para continuar usando o AppexCRM com todos os seus dados.'
              : trialDaysLeft > 0
                ? `Faltam ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia' : 'dias'} no seu trial.`
                : 'Desbloqueie todos os recursos do AppexCRM.'}
          </p>
        </header>

        {!isOwner && (
          <div
            className="max-w-xl mx-auto mb-6 text-sm px-4 py-3 rounded-lg"
            style={{ background: 'var(--warning-bg, rgba(255,176,32,0.1))', color: 'var(--warning, #B45309)' }}
          >
            Apenas o proprietário do workspace pode assinar. Peça a ele para acessar esta página.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ink-3)' }} />
          </div>
        ) : (
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(plans?.length ?? 1, 3)}, minmax(0, 1fr))`,
              maxWidth: (plans?.length ?? 0) <= 2 ? 720 : undefined,
              margin: (plans?.length ?? 0) <= 2 ? '0 auto' : undefined,
            }}
          >
            {plans?.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                catalog={catalog}
                selected={selectedSlug === p.slug}
                onSelect={() => setSelectedSlug(p.slug)}
                onSubscribe={() => subscribeMut.mutate(p)}
                pending={subscribeMut.isPending && subscribeMut.variables?.slug === p.slug}
                disabled={!isOwner}
              />
            ))}
          </div>
        )}

        {subscribeMut.isError && (
          <div
            className="max-w-xl mx-auto mt-6 text-sm text-center px-4 py-3 rounded-lg"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
          >
            {(subscribeMut.error as any)?.response?.data?.message || 'Erro ao assinar'}
          </div>
        )}

        {subscribeMut.isSuccess && (
          <div
            className="max-w-xl mx-auto mt-6 text-sm text-center px-4 py-3 rounded-lg"
            style={{ background: 'var(--success-bg, rgba(14,124,58,0.1))', color: 'var(--success, #0E7C3A)' }}
          >
            ✓ Assinatura ativada. Redirecionando…
          </div>
        )}

        <p className="text-center text-xs mt-10" style={{ color: 'var(--ink-3)' }}>
          Pagamento seguro processado pela Stripe.
        </p>
        <div
          className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs"
          style={{ color: 'var(--ink-3)' }}
        >
          <a href="/termos" style={{ color: 'var(--ink-3)' }}>Termos de Uso</a>
          <a href="/privacidade" style={{ color: 'var(--ink-3)' }}>Política de Privacidade</a>
          <a href="/reembolso" style={{ color: 'var(--ink-3)' }}>Política de Reembolso</a>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan, catalog, selected, onSelect, onSubscribe, pending, disabled,
}: {
  plan: Plan;
  catalog: FeatureDef[];
  selected: boolean;
  onSelect: () => void;
  onSubscribe: () => void;
  pending: boolean;
  disabled: boolean;
}) {
  const price = (plan.priceMonthlyCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return (
    <div
      onClick={onSelect}
      className="relative cursor-pointer transition-all"
      style={{
        background: 'var(--surface)',
        border: selected || plan.highlight ? '2px solid var(--brand-500)' : '1px solid var(--edge)',
        borderRadius: 16,
        padding: 24,
        boxShadow: plan.highlight ? '0 8px 24px rgba(99,91,255,0.15)' : 'var(--shadow-sm)',
      }}
    >
      {plan.highlight && (
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}
        >
          Mais escolhido
        </div>
      )}

      <h3 className="text-base font-semibold" style={{ color: 'var(--ink-1)' }}>{plan.name}</h3>
      {plan.description && (
        <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>{plan.description}</p>
      )}
      <div className="flex items-baseline gap-1 mt-3 mb-5">
        <span className="text-3xl font-semibold" style={{ color: 'var(--ink-1)' }}>R$ {price}</span>
        <span className="text-sm" style={{ color: 'var(--ink-3)' }}>/mês</span>
      </div>

      <ul className="space-y-2.5 mb-6">
        {catalog.map((f) => {
          const included = plan.features.includes(f.key);
          return (
            <li
              key={f.key}
              className="flex items-start gap-2 text-sm"
              style={{ color: included ? 'var(--ink-2)' : 'var(--ink-3)' }}
            >
              {included ? (
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} strokeWidth={2.5} />
              ) : (
                <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ink-3)', opacity: 0.5 }} />
              )}
              <span style={{ textDecoration: included ? 'none' : 'line-through', opacity: included ? 1 : 0.6 }}>
                {f.label}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
        disabled={pending || disabled}
        className="w-full h-10 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
        style={
          plan.highlight
            ? {
                background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
                color: 'white',
                boxShadow: '0 1px 3px rgba(99,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              }
            : {
                background: 'var(--surface)',
                color: 'var(--ink-1)',
                border: '1px solid var(--edge-strong)',
              }
        }
      >
        {pending ? 'Assinando…' : disabled ? 'Apenas proprietário' : `Assinar ${plan.name}`}
      </button>
    </div>
  );
}
