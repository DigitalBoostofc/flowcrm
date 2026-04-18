import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useThemeStore((s) => s.theme);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
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
      {/* Theme toggle top-right */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Ambient glow (dark only) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 pointer-events-none dark:opacity-100 opacity-0 transition-opacity"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.10) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Card */}
        <div className="glass-raised rounded-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              <Zap className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--ink-1)' }}>
              FlowCRM
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Acesse sua conta</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-2)' }}>
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
                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-2)' }}>
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="input-base"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="text-red-500 text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 mt-2 hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--ink-3)' }}>
          Gestão de vendas inteligente
        </p>
      </div>
    </div>
  );
}
