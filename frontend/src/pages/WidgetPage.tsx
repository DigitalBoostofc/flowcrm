import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, Phone, Headphones, Smile, Zap, Send, CheckCircle2, Loader2 } from 'lucide-react';

interface WidgetConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  formBg: string;
  whatsappNumber: string;
  collectEmail: boolean;
}

type Step = 'idle' | 'open' | 'submitting' | 'done';

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

export default function WidgetPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [cfg, setCfg] = useState<WidgetConfig | null>(null);
  const [step, setStep] = useState<Step>('idle');
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
      <div style={{ width: '100%', height: '100%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>Widget não encontrado ou inativo.</p>
      </div>
    );
  }

  const primary = cfg.color || '#6366f1';
  const icon = cfg.icon || 'chat';
  const formBg = cfg.formBg || '#ffffff';

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nome e WhatsApp são obrigatórios.');
      return;
    }
    setError('');
    setStep('submitting');
    try {
      const res = await axios.post(`${API}/api/public/capture/${workspaceId}`, form);
      setStep('done');
      if (res.data?.whatsappNumber) {
        const phone = res.data.whatsappNumber.replace(/\D/g, '');
        const msg = encodeURIComponent(form.message || `Olá! Vi no site e quero saber mais.`);
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao enviar. Tente novamente.');
      setStep('open');
    }
  }

  if (step === 'idle') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
        <button
          onClick={() => setStep('open')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 999,
            background: primary, color: '#fff',
            fontSize: 14, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'transform 0.15s',
          }}
        >
          <WidgetIcon icon={icon} size={20} />
          {cfg.title}
        </button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', padding: 32, textAlign: 'center', maxWidth: 320, width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <CheckCircle2 size={48} style={{ color: primary, margin: '0 auto 12px' }} />
          <h3 style={{ fontWeight: 700, color: '#111', fontSize: 18, margin: '0 0 8px' }}>Mensagem enviada!</h3>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Aguarde nosso contato no WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
      <div style={{
        background: formBg, borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        overflow: 'hidden', width: '100%', maxWidth: 320,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ padding: '16px 20px', background: primary, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WidgetIcon icon={icon} size={20} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{cfg.title}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{cfg.subtitle}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}

          <div>
            <label style={labelStyle}>Nome *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
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

          <button
            onClick={handleSubmit}
            disabled={step === 'submitting'}
            style={{
              width: '100%', padding: '10px 0',
              borderRadius: 10, background: primary, color: '#fff',
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: 'none', cursor: step === 'submitting' ? 'not-allowed' : 'pointer',
              opacity: step === 'submitting' ? 0.7 : 1,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {step === 'submitting'
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
              : <><Send size={16} /> Enviar mensagem</>}
          </button>
        </div>
      </div>
    </div>
  );
}
