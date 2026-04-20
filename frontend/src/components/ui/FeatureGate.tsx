import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { useFeatures } from '@/hooks/useFeatures';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  mode?: 'overlay' | 'hide' | 'inline';
  className?: string;
}

export default function FeatureGate({ feature, children, mode = 'overlay', className }: FeatureGateProps) {
  const { has, isLoading } = useFeatures();
  const unlocked = has(feature);

  if (isLoading || unlocked) return <>{children}</>;

  if (mode === 'hide') return null;

  return <LockedWrapper feature={feature} mode={mode} className={className}>{children}</LockedWrapper>;
}

function LockedWrapper({
  feature,
  children,
  mode,
  className,
}: {
  feature: string;
  children: ReactNode;
  mode: 'overlay' | 'inline';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ''}`}
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ opacity: 0.55, pointerEvents: 'none', filter: 'grayscale(0.2)' }}>
        {children}
      </div>
      {mode === 'overlay' && (
        <div
          className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center justify-center rounded-full"
          style={{
            width: 18,
            height: 18,
            background: 'var(--surface-hover)',
            color: 'var(--ink-3)',
          }}
        >
          <Lock className="w-2.5 h-2.5" />
        </div>
      )}
      {open && <UpgradePopover feature={feature} onClose={() => setOpen(false)} />}
    </div>
  );
}

function UpgradePopover({ feature, onClose }: { feature: string; onClose: () => void }) {
  const navigate = useNavigate();
  const label = FEATURE_LABELS[feature] ?? 'Essa função';

  return (
    <div
      className="absolute left-full top-0 ml-2 z-50 w-64 rounded-xl p-3 shadow-lg"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--edge)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
          }}
        >
          <Zap className="w-3.5 h-3.5 text-white" fill="white" strokeWidth={2.5} />
        </div>
        <h4 className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
          Turbine seu CRM
        </h4>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-2)' }}>
        <strong>{label}</strong> está disponível no plano Performance. Desbloqueie Inbox, Automações e Templates fazendo upgrade.
      </p>
      <button
        onClick={() => {
          onClose();
          navigate('/assinar?plan=performance');
        }}
        className="w-full py-2 text-xs font-medium rounded-lg text-white"
        style={{ background: 'var(--brand-500)' }}
      >
        Fazer upgrade
      </button>
    </div>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  automations: 'Automações',
  automation_templates: 'Templates de automação',
};

export function FeatureLockedScreen({ feature }: { feature: string }) {
  const navigate = useNavigate();
  const label = FEATURE_LABELS[feature] ?? 'Esta função';
  return (
    <div className="flex items-center justify-center h-full p-8" style={{ background: 'var(--canvas)' }}>
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)' }}
      >
        <div
          className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-4"
          style={{
            background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
            boxShadow: '0 8px 24px rgba(99,91,255,0.35)',
          }}
        >
          <Zap className="w-6 h-6 text-white" fill="white" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink-1)' }}>
          Turbine seu CRM com Performance
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
          <strong>{label}</strong> faz parte do plano Performance. Desbloqueie Inbox, Automações e Templates para acelerar seu time.
        </p>
        <button
          onClick={() => navigate('/assinar?plan=performance')}
          className="w-full py-2.5 text-sm font-medium rounded-lg text-white"
          style={{ background: 'var(--brand-500)' }}
        >
          Fazer upgrade agora
        </button>
      </div>
    </div>
  );
}
