import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { signupStart, signupVerify, signupResend } from '@/api/signup';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const startSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  workspaceName: z.string().min(2, 'Nome do workspace obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\d{10,15}$/, 'Apenas dígitos (DDI+DDD+número)'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type StartForm = z.infer<typeof startSchema>;

const verifySchema = z.object({ code: z.string().length(6, 'Código de 6 dígitos') });
type VerifyForm = z.infer<typeof verifySchema>;

type Step = 'form' | 'otp';

export default function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useThemeStore((s) => s.theme);
  const [step, setStep] = useState<Step>('form');
  const [otpId, setOtpId] = useState<string>('');
  const [phoneMasked, setPhoneMasked] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    theme === 'dark' ? html.classList.add('dark') : html.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const startForm = useForm<StartForm>({ resolver: zodResolver(startSchema) });
  const verifyForm = useForm<VerifyForm>({ resolver: zodResolver(verifySchema) });

  const onStart = async (data: StartForm) => {
    setServerError(null);
    try {
      const res = await signupStart(data);
      setOtpId(res.otpId);
      setPhoneMasked(maskPhone(data.phone));
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Erro ao iniciar cadastro');
    }
  };

  const onVerify = async (data: VerifyForm) => {
    setServerError(null);
    try {
      const res = await signupVerify(otpId, data.code);
      setAuth(res.accessToken, res.user);
      navigate('/');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Código inválido');
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    setServerError(null);
    try {
      await signupResend(otpId);
      setResendCooldown(60);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Erro ao reenviar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--canvas)' }}>
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[420px]">
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
            {step === 'form' ? 'Criar conta no AppexCRM' : 'Verificar WhatsApp'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            {step === 'form' ? '7 dias grátis. Sem cartão.' : `Enviamos um código para ${phoneMasked}`}
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            padding: '24px',
          }}
        >
          {step === 'form' ? (
            <form onSubmit={startForm.handleSubmit(onStart)} className="space-y-3.5">
              <Field label="Seu nome" error={startForm.formState.errors.name?.message}>
                <input className="input-base" placeholder="Maria Silva" autoComplete="name" {...startForm.register('name')} />
              </Field>

              <Field label="Nome do workspace" error={startForm.formState.errors.workspaceName?.message}>
                <input className="input-base" placeholder="Minha Empresa" {...startForm.register('workspaceName')} />
              </Field>

              <Field label="Email" error={startForm.formState.errors.email?.message}>
                <input type="email" className="input-base" placeholder="voce@empresa.com" autoComplete="email" {...startForm.register('email')} />
              </Field>

              <Field label="WhatsApp" error={startForm.formState.errors.phone?.message} hint="Ex: 5511999887766">
                <input inputMode="numeric" className="input-base" placeholder="5511999887766" autoComplete="tel" {...startForm.register('phone')} />
              </Field>

              <Field label="Senha" error={startForm.formState.errors.password?.message}>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input-base pr-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...startForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--ink-3)' }}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

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
                disabled={startForm.formState.isSubmitting}
                className="w-full h-9 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 mt-1"
                style={{
                  background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
                  boxShadow: '0 1px 3px rgba(99,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                {startForm.formState.isSubmitting ? 'Enviando código...' : 'Receber código no WhatsApp'}
              </button>

              <div className="text-xs text-center pt-2" style={{ color: 'var(--ink-3)' }}>
                Já tem conta?{' '}
                <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
                  Entrar
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
              <Field label="Código de 6 dígitos" error={verifyForm.formState.errors.code?.message}>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  className="input-base text-center tracking-[0.5em] text-lg font-mono"
                  placeholder="••••••"
                  {...verifyForm.register('code')}
                />
              </Field>

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
                disabled={verifyForm.formState.isSubmitting}
                className="w-full h-9 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)',
                  boxShadow: '0 1px 3px rgba(99,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                {verifyForm.formState.isSubmitting ? 'Verificando...' : 'Verificar e criar conta'}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => { setStep('form'); setServerError(null); }}
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendCooldown > 0}
                  className="font-medium disabled:opacity-40"
                  style={{ color: 'var(--accent)' }}
                >
                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{label}</label>
      {children}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{hint}</p>}
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  const last4 = phone.slice(-4);
  return `+${phone.slice(0, phone.length - 8)} •••• ${last4}`;
}
