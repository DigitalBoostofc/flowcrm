import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Mail, Lock, Phone, Trash2, ShieldCheck } from 'lucide-react';
import {
  getMe, updateMe, uploadMyAvatar, removeMyAvatar,
  sendProfileOtp, verifyProfileOtp, changeMyEmail, changeMyPassword,
  type ProfileOtpPurpose,
} from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToastStore } from '@/store/toast.store';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';

export default function Perfil() {
  const qc = useQueryClient();
  const token = useAuthStore(s => s.token);
  const setAuth = useAuthStore(s => s.setAuth);
  const toast = useToastStore(s => s.push);

  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const [otpOpen, setOtpOpen] = useState<null | ProfileOtpPurpose>(null);

  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setPhone(me.phone ?? '');
    }
  }, [me]);

  const syncAuth = (user: any) => {
    if (token) setAuth(token, user);
    qc.invalidateQueries({ queryKey: ['me'] });
  };

  const saveProfile = useMutation({
    mutationFn: () => updateMe({ name: name.trim(), phone: phone.trim() || undefined }),
    onSuccess: (u) => { syncAuth(u); toast({ title: 'Perfil atualizado' }); },
    onError: (err: any) => toast({ title: 'Erro', body: err?.response?.data?.message ?? 'Não foi possível salvar' }),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => uploadMyAvatar(file),
    onSuccess: (u) => { syncAuth(u); toast({ title: 'Foto atualizada' }); },
    onError: (err: any) => toast({ title: 'Erro', body: err?.response?.data?.message ?? 'Falha no upload' }),
    onSettled: () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
      setPreview(null);
    },
  });

  const removeAvatar = useMutation({
    mutationFn: removeMyAvatar,
    onSuccess: (u) => { syncAuth(u); toast({ title: 'Foto removida' }); },
  });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo grande', body: 'Limite de 5MB por imagem.' });
      return;
    }
    const blob = URL.createObjectURL(f);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = blob;
    setPreview(blob);
    uploadAvatar.mutate(f);
    e.target.value = '';
  };

  if (isLoading || !me) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
      </div>
    );
  }

  const hasPhone = !!me.phone?.trim();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>Meu perfil</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>Gerencie suas informações pessoais e credenciais de acesso.</p>
      </div>

      {/* Avatar */}
      <section
        className="p-5 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar name={me.name} url={preview ?? me.avatarUrl} size={80} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute -bottom-1 -right-1 p-2 rounded-full"
              style={{ background: 'var(--brand-500)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
              aria-label="Alterar foto"
            >
              {uploadAvatar.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink-1)' }}>{me.name}</div>
            <div className="text-xs truncate mt-0.5" style={{ color: 'var(--ink-3)' }}>{me.email}</div>
            {me.avatarUrl && (
              <button
                type="button"
                onClick={() => removeAvatar.mutate()}
                className="mt-2 inline-flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--danger)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover foto
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Dados pessoais */}
      <section
        className="p-5 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
      >
        <h2 className="text-[13px] font-semibold mb-4" style={{ color: 'var(--ink-1)' }}>Dados pessoais</h2>
        <div className="space-y-4">
          <Field label="Nome">
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </Field>
          <Field label="WhatsApp" hint="Usado para receber códigos de verificação.">
            <input
              className="input-base"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="55 11 91234-5678"
              inputMode="tel"
            />
          </Field>
          <div className="flex justify-end">
            <button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending || (name === me.name && (phone || '') === (me.phone || ''))}
              className="btn-primary"
            >
              {saveProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar alterações
            </button>
          </div>
        </div>
      </section>

      {/* Credenciais */}
      <section
        className="p-5 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge)', boxShadow: 'var(--shadow-md)' }}
      >
        <h2 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--ink-1)' }}>Credenciais</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
          Alterações em e-mail e senha exigem confirmação por código enviado ao WhatsApp.
        </p>

        {!hasPhone && (
          <div
            className="mb-4 rounded-md p-3 text-xs"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
          >
            Cadastre seu WhatsApp acima para habilitar troca de e-mail e senha.
          </div>
        )}

        <div className="space-y-2">
          <CredentialRow
            icon={<Mail className="w-4 h-4" />}
            title="E-mail"
            value={me.email}
            actionLabel="Alterar"
            disabled={!hasPhone}
            onClick={() => setOtpOpen('email_change')}
          />
          <CredentialRow
            icon={<Lock className="w-4 h-4" />}
            title="Senha"
            value="••••••••"
            actionLabel="Alterar"
            disabled={!hasPhone}
            onClick={() => setOtpOpen('password_change')}
          />
        </div>
      </section>

      {otpOpen && (
        <OtpFlowModal
          purpose={otpOpen}
          currentEmail={me.email}
          onClose={() => setOtpOpen(null)}
          onDone={(u) => { if (u) syncAuth(u); setOtpOpen(null); }}
        />
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>{label}</div>
      {children}
      {hint && <div className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>{hint}</div>}
    </label>
  );
}

function CredentialRow({
  icon, title, value, actionLabel, onClick, disabled,
}: {
  icon: React.ReactNode; title: string; value: string;
  actionLabel: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md"
      style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--edge)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{title}</div>
        <div className="text-sm truncate" style={{ color: 'var(--ink-1)' }}>{value}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="btn-ghost"
        style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

type OtpStep = 'request' | 'verify' | 'apply';

function OtpFlowModal({
  purpose, currentEmail, onClose, onDone,
}: {
  purpose: ProfileOtpPurpose;
  currentEmail: string;
  onClose: () => void;
  onDone: (user?: any) => void;
}) {
  const toast = useToastStore(s => s.push);
  const [step, setStep] = useState<OtpStep>('request');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const title = purpose === 'email_change' ? 'Alterar e-mail' : 'Alterar senha';

  const sendMut = useMutation({
    mutationFn: () => sendProfileOtp(purpose),
    onSuccess: (d) => { setMaskedPhone(d.maskedPhone); setStep('verify'); },
    onError: (err: any) => toast({ title: 'Erro', body: err?.response?.data?.message ?? 'Não foi possível enviar o código' }),
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyProfileOtp(purpose, code.trim()),
    onSuccess: (d) => { setOtpToken(d.otpToken); setStep('apply'); },
    onError: (err: any) => toast({ title: 'Erro', body: err?.response?.data?.message ?? 'Código inválido' }),
  });

  const emailMut = useMutation({
    mutationFn: () => changeMyEmail({ email: newEmail.trim(), otpToken }),
    onSuccess: (u) => { toast({ title: 'E-mail atualizado' }); onDone(u); },
    onError: (err: any) => toast({ title: 'Erro', body: err?.response?.data?.message ?? 'Falha ao trocar e-mail' }),
  });

  const passwordMut = useMutation({
    mutationFn: () => changeMyPassword({ newPassword, otpToken }),
    onSuccess: () => { toast({ title: 'Senha alterada' }); onDone(); },
    onError: (err: any) => toast({ title: 'Erro', body: err?.response?.data?.message ?? 'Falha ao trocar senha' }),
  });

  return (
    <Modal open onClose={onClose} title={title}>
      {step === 'request' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-md" style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}>
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} />
            <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
              Vamos enviar um código de 6 dígitos para o seu WhatsApp. Você precisará informá-lo para confirmar a alteração.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
              {sendMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar código
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-md" style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)' }}>
            <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-500)' }} />
            <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
              Código enviado para <strong>{maskedPhone}</strong>. O código expira em 10 minutos.
            </div>
          </div>
          <label className="block">
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Código de verificação</div>
            <input
              className="input-base text-center"
              style={{ letterSpacing: '0.5em', fontSize: 18 }}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
            />
          </label>
          <div className="flex justify-between items-center">
            <button
              className="text-xs"
              style={{ color: 'var(--brand-500)' }}
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending}
            >
              Reenviar código
            </button>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={onClose}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={() => verifyMut.mutate()}
                disabled={code.length !== 6 || verifyMut.isPending}
              >
                {verifyMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Validar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'apply' && purpose === 'email_change' && (
        <div className="space-y-4">
          <label className="block">
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>E-mail atual</div>
            <input className="input-base" value={currentEmail} disabled />
          </label>
          <label className="block">
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Novo e-mail</div>
            <input
              className="input-base"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="novo@exemplo.com"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={() => emailMut.mutate()}
              disabled={!newEmail.trim() || emailMut.isPending}
            >
              {emailMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar troca
            </button>
          </div>
        </div>
      )}

      {step === 'apply' && purpose === 'password_change' && (
        <div className="space-y-4">
          <label className="block">
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Nova senha</div>
            <input
              className="input-base"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoFocus
            />
          </label>
          <label className="block">
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--ink-2)' }}>Confirmar senha</div>
            <input
              className="input-base"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </label>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div className="text-xs" style={{ color: 'var(--danger)' }}>As senhas não coincidem.</div>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={() => passwordMut.mutate()}
              disabled={
                newPassword.length < 6 ||
                newPassword !== confirmPassword ||
                passwordMut.isPending
              }
            >
              {passwordMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar troca
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
