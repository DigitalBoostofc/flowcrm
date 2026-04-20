import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Zap, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { login, forgotPassword, verifyResetCode, resetPassword } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

/* ── Schemas ─────────────────────────────────── */

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginData = z.infer<typeof loginSchema>;

type ForgotStep = 'email' | 'code' | 'new-password' | 'done';

/* ── Login Form ──────────────────────────────── */

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setServerError(null);
    try {
      const res = await login(data.email, data.password);
      setAuth(res.accessToken, res.user);
      navigate('/funil');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Credenciais inválidas');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Email</label>
        <input type="email" autoComplete="email" className="input-base" placeholder="seu@email.com" {...register('email')} />
        {errors.email && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Senha</label>
        <div className="relative">
          <input type={showPwd ? 'text' : 'password'} autoComplete="current-password" className="input-base pr-10" placeholder="••••••••" {...register('password')} />
          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} tabIndex={-1}>
            {showPwd ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
          </button>
        </div>
        {errors.password && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>}
      </div>

      {serverError && (
        <div className="text-xs px-3 py-2.5 rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(229,72,77,0.2)' }}>
          {serverError}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="w-full h-9 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 mt-1"
        style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)', boxShadow: '0 1px 3px rgba(99,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)', border: '1px solid rgba(0,0,0,0.08)' }}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onForgot} className="text-xs" style={{ color: 'var(--brand-500)' }}>
          Esqueceu a senha?
        </button>
        <Link to="/signup" className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Criar conta
        </Link>
      </div>
    </form>
  );
}

/* ── Forgot Password Flow ────────────────────── */

function ForgotPasswordFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Step 1 — Email */
  const handleEmailSubmit = async () => {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMaskedPhone(res.maskedPhone);
      setStep('code');
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar código.');
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 — Code */
  const handleCodeChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodeKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(''));
      codeRefs.current[5]?.focus();
    }
  };

  const handleCodeSubmit = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) return;
    setError(null);
    setLoading(true);
    try {
      const res = await verifyResetCode(email, fullCode);
      setResetToken(res.resetToken);
      setStep('new-password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido ou expirado.');
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  /* Step 3 — New password */
  const handleResetSubmit = async () => {
    if (newPwd.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { setError('As senhas não coincidem.'); return; }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(resetToken, newPwd);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 36, padding: '0 12px', borderRadius: 8,
    fontSize: 13.5, fontFamily: 'inherit',
    background: 'var(--surface-hover)', border: '1px solid var(--edge-strong)',
    color: 'var(--ink-1)', outline: 'none',
  };

  return (
    <div>
      {/* Back button */}
      {step !== 'done' && (
        <button onClick={step === 'email' ? onBack : () => setStep('email')} className="flex items-center gap-1.5 mb-5 text-xs" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Voltar
        </button>
      )}

      {/* Step 1: Email */}
      {step === 'email' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>Recuperar senha</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Informe seu e-mail para receber o código no WhatsApp.</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>E-mail cadastrado</label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
          <button onClick={handleEmailSubmit} disabled={!email || loading} className="w-full h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}>
            {loading ? 'Enviando...' : 'Continuar'}
          </button>
        </div>
      )}

      {/* Step 2: Code */}
      {step === 'code' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>Insira o código</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
              Enviamos um código de 6 dígitos para o WhatsApp com final <strong style={{ color: 'var(--ink-2)' }}>{maskedPhone}</strong>.
            </p>
          </div>

          <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => { codeRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => handleCodeKey(i, e)}
                className="text-center text-lg font-semibold rounded-lg outline-none"
                style={{
                  width: 44, height: 48,
                  background: 'var(--surface-hover)',
                  border: digit ? '2px solid var(--brand-500)' : '1px solid var(--edge-strong)',
                  color: 'var(--ink-1)',
                  transition: 'border-color 0.15s',
                }}
              />
            ))}
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}

          <button onClick={handleCodeSubmit} disabled={code.join('').length < 6 || loading} className="w-full h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}>
            {loading ? 'Verificando...' : 'Verificar código'}
          </button>

          <button onClick={handleEmailSubmit} disabled={loading} className="w-full text-xs text-center" style={{ color: 'var(--ink-3)' }}>
            Não recebeu? <span style={{ color: 'var(--brand-500)' }}>Reenviar código</span>
          </button>
        </div>
      )}

      {/* Step 3: New password */}
      {step === 'new-password' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>Nova senha</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Escolha uma nova senha para sua conta.</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Nova senha</label>
            <div className="relative">
              <input style={{ ...inputStyle, paddingRight: 36 }} type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" autoFocus />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} tabIndex={-1}>
                {showPwd ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Confirmar senha</label>
            <input style={inputStyle} type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a senha" onKeyDown={e => e.key === 'Enter' && handleResetSubmit()} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
          <button onClick={handleResetSubmit} disabled={!newPwd || !confirmPwd || loading} className="w-full h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}>
            {loading ? 'Salvando...' : 'Confirmar nova senha'}
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--success-bg)' }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)' }}>Senha redefinida!</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Sua senha foi atualizada com sucesso.</p>
          </div>
          <button onClick={onBack} className="w-full h-9 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)' }}>
            Fazer login
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Export ─────────────────────────────── */

export default function Login() {
  const theme = useThemeStore(s => s.theme);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--canvas)' }}>
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)', boxShadow: '0 4px 16px rgba(99,91,255,0.4)' }}>
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} fill="white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.02em' }}>
            {showForgot ? 'AppexCRM' : 'Entrar no AppexCRM'}
          </h1>
          {!showForgot && (
            <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>Gestão de vendas inteligente</p>
          )}
        </div>

        {/* Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: '24px' }}>
          {showForgot
            ? <ForgotPasswordFlow onBack={() => setShowForgot(false)} />
            : <LoginForm onForgot={() => setShowForgot(true)} />
          }
        </div>
      </div>
    </div>
  );
}
