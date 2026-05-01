export interface FeatureDef {
  key: string;
  label: string;
  description: string;
}

export const FEATURE_CATALOG: Record<string, FeatureDef> = {
  inbox: {
    key: 'inbox',
    label: 'Inbox',
    description: 'Caixa de entrada unificada para atendimento via canais conectados.',
  },
  analytics: {
    key: 'analytics',
    label: 'Analytics',
    description: 'Painel de análise de desempenho, conversão e métricas do CRM.',
  },
  tasks: {
    key: 'tasks',
    label: 'Tarefas',
    description: 'Módulo de tarefas com agenda, lembretes e integração Google Calendar.',
  },
  automations: {
    key: 'automations',
    label: 'Automações',
    description: 'Fluxos automatizados disparados por etapas do funil e eventos.',
  },
  automation_templates: {
    key: 'automation_templates',
    label: 'Templates de automação',
    description: 'Modelos de mensagem usados pelas automações.',
  },
  whatsapp_channels: {
    key: 'whatsapp_channels',
    label: 'Canais WhatsApp',
    description: 'Conecte números de WhatsApp para enviar e receber mensagens.',
  },
  ai_agents: {
    key: 'ai_agents',
    label: 'Agentes IA',
    description: 'Agentes de IA que conversam com leads pelo WhatsApp, qualificam B2B/B2C e movem o funil de vendas automaticamente. Disponível no plano AI Enterprise.',
  },
};

export const FEATURE_KEYS = Object.keys(FEATURE_CATALOG);

export type FeatureKey = keyof typeof FEATURE_CATALOG;

export function isValidFeatureKey(key: string): boolean {
  return key in FEATURE_CATALOG;
}
