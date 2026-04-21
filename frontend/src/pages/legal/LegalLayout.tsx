import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

export default function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm mb-6"
          style={{ color: 'var(--ink-3)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <header className="mb-10 flex items-center gap-3">
          <div
            className="inline-flex w-10 h-10 rounded-xl items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
              boxShadow: '0 4px 12px rgba(99,91,255,0.25)',
            }}
          >
            <Zap className="w-5 h-5 text-white" fill="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
              Última atualização: {updatedAt}
            </p>
          </div>
        </header>

        <article
          className="legal-article text-sm leading-relaxed"
          style={{ color: 'var(--ink-2)' }}
        >
          {children}
        </article>

        <footer className="mt-14 pt-6 flex flex-wrap gap-4 text-xs" style={{ borderTop: '1px solid var(--edge)', color: 'var(--ink-3)' }}>
          <Link to="/termos" style={{ color: 'var(--ink-3)' }}>Termos de Uso</Link>
          <Link to="/privacidade" style={{ color: 'var(--ink-3)' }}>Política de Privacidade</Link>
          <Link to="/reembolso" style={{ color: 'var(--ink-3)' }}>Política de Reembolso</Link>
          <span style={{ marginLeft: 'auto' }}>
            57.842.141 LTDA (Digital Boost) — CNPJ 57.842.141/0001-79
          </span>
        </footer>
      </div>

      <style>{`
        .legal-article h2 {
          font-size: 15px;
          font-weight: 600;
          margin-top: 28px;
          margin-bottom: 10px;
          color: var(--ink-1);
          letter-spacing: -0.01em;
        }
        .legal-article h3 {
          font-size: 14px;
          font-weight: 600;
          margin-top: 18px;
          margin-bottom: 6px;
          color: var(--ink-1);
        }
        .legal-article p { margin-bottom: 10px; }
        .legal-article ul { list-style: disc; padding-left: 20px; margin-bottom: 10px; }
        .legal-article li { margin-bottom: 4px; }
        .legal-article strong { color: var(--ink-1); font-weight: 600; }
        .legal-article a { color: var(--brand-500); text-decoration: underline; }
      `}</style>
    </div>
  );
}
