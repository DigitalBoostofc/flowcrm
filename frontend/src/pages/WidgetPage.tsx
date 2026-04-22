import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, Phone, Headphones, Smile, Zap, Send, Loader2 } from 'lucide-react';

interface WidgetConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  formBg: string;
  successMessage: string;
  whatsappRedirect: boolean;
  whatsappNumber: string;
  collectEmail: boolean;
}

type Step = 'idle' | 'select' | 'open' | 'submitting' | 'done';
type ContactType = 'fisica' | 'juridica';

const API = '';

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WidgetIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const props = { size };
  if (icon === 'whatsapp')    return <WhatsAppIcon size={size} />;
  if (icon === 'phone')       return <Phone {...props} />;
  if (icon === 'headphones')  return <Headphones {...props} />;
  if (icon === 'smile')       return <Smile {...props} />;
  if (icon === 'zap')         return <Zap {...props} />;
  return <MessageCircle {...props} />;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  color: '#111',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#4b5563',
  marginBottom: 4,
};

function CardHeader({ cfg, primary, icon }: { cfg: WidgetConfig; primary: string; icon: string }) {
  return (
    <div style={{ padding: '16px 20px', background: primary, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
      <WidgetIcon icon={icon} size={20} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{cfg.title}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{cfg.subtitle}</div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [cfg, setCfg] = useState<WidgetConfig | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [contactType, setContactType] = useState<ContactType | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.color = '#111';
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    axios
      .get(`${API}/api/public/capture/${workspaceId}/config`)
      .then(r => { if (r.data) setCfg(r.data.config); })
      .catch(() => {});
  }, [workspaceId]);

  if (!cfg) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>Widget não encontrado ou inativo.</p>
      </div>
    );
  }

  const primary = cfg.color || '#6366f1';
  const icon = cfg.icon || 'chat';
  const formBg = cfg.formBg || '#ffffff';

  function selectType(type: ContactType) {
    setContactType(type);
    setStep('open');
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError(contactType === 'juridica' ? 'Nome da empresa e WhatsApp são obrigatórios.' : 'Nome e WhatsApp são obrigatórios.');
      return;
    }
    setError('');
    setStep('submitting');
    try {
      const res = await axios.post(`${API}/api/public/capture/${workspaceId}`, { ...form, contactType });
      setStep('done');
      if (cfg?.whatsappRedirect && res.data?.whatsappNumber) {
        const phone = res.data.whatsappNumber.replace(/\D/g, '');
        const msg = encodeURIComponent(form.message || `Olá! Vi no site e quero saber mais.`);
        setTimeout(() => { window.open(`https://wa.me/${phone}?text=${msg}`, '_blank'); }, 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao enviar. Tente novamente.');
      setStep('open');
    }
  }

  /* ── Botão flutuante ── */
  if (step === 'idle') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
        <button
          onClick={() => setStep('select')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 999,
            background: primary, color: '#fff',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <WidgetIcon icon={icon} size={20} />
          {cfg.title}
        </button>
      </div>
    );
  }

  /* ── Seleção: Física / Jurídica ── */
  if (step === 'select') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
        <div style={{
          background: formBg, borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          overflow: 'hidden', width: '100%', maxWidth: 320,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <CardHeader cfg={cfg} primary={primary} icon={icon} />
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 16, textAlign: 'center' }}>
              Como você gostaria de se identificar?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {([
                {
                  type: 'fisica' as ContactType,
                  label: 'Pessoa Física',
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  ),
                },
                {
                  type: 'juridica' as ContactType,
                  label: 'Pessoa Jurídica',
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="9" width="18" height="13" rx="2" />
                      <path d="M8 9V7a4 4 0 0 1 8 0v2" />
                      <line x1="12" y1="13" x2="12" y2="17" />
                      <line x1="10" y1="15" x2="14" y2="15" />
                    </svg>
                  ),
                },
              ] as const).map(({ type, label, icon: TypeIcon }) => (
                <button
                  key={type}
                  onClick={() => selectType(type)}
                  style={{
                    flex: 1, padding: '18px 8px', borderRadius: 12,
                    border: '2px solid #e5e7eb',
                    background: '#fff', color: '#111',
                    cursor: 'pointer', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    fontSize: 12, fontWeight: 500,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = primary;
                    (e.currentTarget as HTMLButtonElement).style.color = primary;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLButtonElement).style.color = '#111';
                  }}
                >
                  <span style={{ color: 'inherit' }}>{TypeIcon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Formulário ── */
  if (step === 'open' || step === 'submitting') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
        <div style={{
          background: formBg, borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          overflow: 'hidden', width: '100%', maxWidth: 320,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <CardHeader cfg={cfg} primary={primary} icon={icon} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}

            <div>
              <label style={labelStyle}>
                {contactType === 'juridica' ? 'Nome da empresa *' : 'Nome *'}
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={contactType === 'juridica' ? 'Razão social ou nome fantasia' : 'Seu nome'}
                style={inputStyle}
                autoFocus
              />
            </div>

            <div>
              <label style={labelStyle}>WhatsApp *</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                type="tel"
                style={inputStyle}
              />
            </div>

            {cfg.collectEmail && (
              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  type="email"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Mensagem</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Como podemos ajudar?"
                rows={2}
                style={{ ...inputStyle, resize: 'none', height: 'auto', padding: '8px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setStep('select'); setError(''); }}
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: '#f3f4f6', color: '#374151',
                  fontSize: 13, fontWeight: 500, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ←
              </button>
              <button
                onClick={handleSubmit}
                disabled={step === 'submitting'}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: primary, color: '#fff',
                  fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  border: 'none', cursor: step === 'submitting' ? 'not-allowed' : 'pointer',
                  opacity: step === 'submitting' ? 0.7 : 1,
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                }}
              >
                {step === 'submitting'
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                  : <><Send size={16} /> Enviar mensagem</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Confirmação ── */
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
      <div style={{
        background: formBg, borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        overflow: 'hidden', width: '100%', maxWidth: 320,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <CardHeader cfg={cfg} primary={primary} icon={icon} />
        <div style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ fontWeight: 700, color: '#111', fontSize: 17, margin: '0 0 8px' }}>Mensagem enviada!</h3>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            {cfg.successMessage || 'Logo nosso time entrará em contato. Obrigado.'}
          </p>
        </div>
      </div>
    </div>
  );
}
