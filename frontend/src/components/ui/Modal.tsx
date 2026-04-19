import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  description?: string;
}

export default function Modal({ open, onClose, title, description, children, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className={`${maxWidth} w-full animate-fade-up`}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--edge-strong)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--edge)' }}
        >
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
              {title}
            </h2>
            {description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors ml-4 flex-shrink-0"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
