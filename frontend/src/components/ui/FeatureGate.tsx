import { ReactNode, useEffect, useRef, useState } from 'react';
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
      {open && <UpgradePopover feature={feature} />}
    </div>
  );
}

function ComingSoonButton({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <button
      disabled
      className={`w-full font-medium rounded-lg cursor-not-allowed ${size === 'md' ? 'py-2.5 text-sm' : 'py-2 text-xs'}`}
      style={{
        background: 'var(--surface-hover)',
        color: 'var(--ink-3)',
        border: '1px solid var(--edge)',
      }}
    >
      Em breve
    </button>
  );
}

function UpgradePopover({ feature }: { feature: string }) {
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
          Em desenvolvimento
        </h4>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-2)' }}>
        <strong>{label}</strong> será liberada em breve para todos os planos. Fique de olho nas próximas atualizações.
      </p>
      <ComingSoonButton size="sm" />
    </div>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  automations: 'Automações',
  automation_templates: 'Templates de automação',
  whatsapp_channels: 'Canais WhatsApp',
};

export function FeatureLockedScreen({ feature }: { feature: string }) {
  const label = FEATURE_LABELS[feature] ?? 'Esta função';
  return (
    <div
      className="w-full flex items-center justify-center p-6"
      style={{ minHeight: '100%', background: 'var(--canvas)' }}
    >
      <div
        className="feature-locked-card relative max-w-md w-full rounded-2xl p-8 text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(99,91,255,0.4)',
          boxShadow:
            '0 0 0 1px rgba(99,91,255,0.15), 0 20px 60px rgba(99,91,255,0.45), 0 0 80px rgba(99,91,255,0.35)',
        }}
      >
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
            boxShadow: '0 12px 32px rgba(99,91,255,0.55), 0 0 40px rgba(99,91,255,0.4)',
          }}
        >
          <Zap className="w-7 h-7 text-white" fill="white" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink-1)' }}>
          Em breve
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>
          <strong>{label}</strong> ainda está em desenvolvimento e será liberada em breve para todos os planos.
        </p>
        <ComingSoonButton size="md" />
      </div>
      <style>{`
        @keyframes feature-locked-glow {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(99,91,255,0.15), 0 20px 60px rgba(99,91,255,0.45), 0 0 80px rgba(99,91,255,0.35);
          }
          50% {
            box-shadow: 0 0 0 1px rgba(99,91,255,0.25), 0 24px 70px rgba(99,91,255,0.6), 0 0 100px rgba(99,91,255,0.5);
          }
        }
        .feature-locked-card {
          animation: feature-locked-glow 2.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
