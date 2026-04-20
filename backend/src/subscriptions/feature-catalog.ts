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
};

export const FEATURE_KEYS = Object.keys(FEATURE_CATALOG);

export type FeatureKey = keyof typeof FEATURE_CATALOG;

export function isValidFeatureKey(key: string): boolean {
  return key in FEATURE_CATALOG;
}
