import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';

interface WidgetConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  color: string;
  whatsappNumber: string;
  collectEmail: boolean;
}

type Step = 'idle' | 'open' | 'submitting' | 'done';

const API = '';

export default function WidgetPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [cfg, setCfg] = useState<WidgetConfig | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
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
      <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>Widget não encontrado ou inativo.</p>
      </div>
    );
  }

  const primary = cfg.color || '#6366f1';

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
      <div className="flex items-end justify-end w-full h-full p-4" style={{ background: 'transparent' }}>
        <button
          onClick={() => setStep('open')}
          className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-medium text-sm transition-transform hover:scale-105 active:scale-95"
          style={{ background: primary }}
        >
          <MessageCircle className="w-5 h-5" />
          {cfg.title}
        </button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex items-center justify-center w-full h-full p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-xs w-full">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: primary }} />
          <h3 className="font-bold text-gray-800 text-lg mb-1">Mensagem enviada!</h3>
          <p className="text-gray-500 text-sm">Aguarde nosso contato no WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-end w-full h-full p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-xs">
        <div className="px-5 py-4 text-white" style={{ background: primary }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div>
              <div className="font-semibold text-sm">{cfg.title}</div>
              <div className="text-xs opacity-80">{cfg.subtitle}</div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ '--tw-ring-color': primary } as any}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">WhatsApp *</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              type="tel"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ '--tw-ring-color': primary } as any}
            />
          </div>

          {cfg.collectEmail && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">E-mail</label>
              <input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ '--tw-ring-color': primary } as any}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Mensagem</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Como podemos ajudar?"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2"
              style={{ '--tw-ring-color': primary } as any}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={step === 'submitting'}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{ background: primary, opacity: step === 'submitting' ? 0.7 : 1 }}
          >
            {step === 'submitting'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Enviar mensagem</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
