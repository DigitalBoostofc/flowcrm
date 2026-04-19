import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const theme = useThemeStore(s => s.theme);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    theme === 'dark' ? html.classList.add('dark') : html.classList.remove('dark');
  }, [theme]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await login(data.email, data.password);
      setAuth(res.accessToken, res.user);
      navigate('/');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Credenciais inválidas');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--canvas)' }}
    >
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[380px]">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
              boxShadow: '0 4px 16px rgba(99,91,255,0.4)',
            }}
          >
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} fill="white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
            Entrar no FlowCRM
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Gestão de vendas inteligente
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            padding: '24px',
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                className="input-base"
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-base pr-10"
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-3)' }}
                  tabIndex={-1}
                >
                  {showPwd
                    ? <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                    : <Eye className="w-4 h-4" strokeWidth={1.75} />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div
                className="text-xs px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(229,72,77,0.2)' }}
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 mt-1"
              style={{
                background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
                boxShadow: '0 1px 3px rgba(99,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-xs text-center pt-2" style={{ color: 'var(--ink-3)' }}>
              Não tem conta?{' '}
              <Link to="/signup" className="font-medium" style={{ color: 'var(--accent)' }}>
                Criar conta grátis
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
