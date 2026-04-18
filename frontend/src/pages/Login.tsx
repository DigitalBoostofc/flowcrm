import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

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
      style={{
        background: '#07070f',
        backgroundImage: `
          radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%),
          radial-gradient(#1a1a2e 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 28px 28px',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.12) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.08] p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              <Zap className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">FlowCRM</h1>
            <p className="text-xs text-slate-600 mt-1">Acesse sua conta</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-700 border border-white/[0.08] focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-700 border border-white/[0.08] focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="text-red-400 text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="relative w-full py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-200 disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              <span className="relative z-10">
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </span>
            </button>
          </form>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-slate-700 mt-5">
          Gestão de vendas inteligente
        </p>
      </div>
    </div>
  );
}
