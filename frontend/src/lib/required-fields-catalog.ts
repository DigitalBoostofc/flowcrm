import type { RequiredFieldTarget } from '@/api/stage-required-fields';

export interface FieldDef {
  key: string;
  label: string;
}

export interface CatalogGroup {
  target: RequiredFieldTarget;
  label: string;
  fields: FieldDef[];
}

export const FIELD_CATALOG: CatalogGroup[] = [
  {
    target: 'lead',
    label: 'Negócio',
    fields: [
      { key: 'title', label: 'Título do negócio' },
      { key: 'value', label: 'Valor' },
      { key: 'ranking', label: 'Ranking' },
      { key: 'startDate', label: 'Data de início' },
      { key: 'conclusionDate', label: 'Data de conclusão' },
      { key: 'notes', label: 'Observações' },
    ],
  },
  {
    target: 'company',
    label: 'Empresa',
    fields: [
      { key: 'name', label: 'Nome da empresa' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'razaoSocial', label: 'Razão social' },
      { key: 'email', label: 'Email' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'website', label: 'Website' },
      { key: 'setor', label: 'Setor' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'origem', label: 'Origem' },
    ],
  },
  {
    target: 'contact',
    label: 'Pessoa',
    fields: [
      { key: 'name', label: 'Nome completo' },
      { key: 'phone', label: 'Telefone' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'email', label: 'Email' },
      { key: 'cpf', label: 'CPF' },
      { key: 'birthDay', label: 'Data de aniversário' },
      { key: 'company', label: 'Empresa' },
      { key: 'role', label: 'Cargo' },
    ],
  },
];

export function findFieldLabel(target: string, key: string): string {
  const group = FIELD_CATALOG.find((g) => g.target === target);
  if (!group) return key;
  return group.fields.find((f) => f.key === key)?.label ?? key;
}

export function findGroupLabel(target: string): string {
  return FIELD_CATALOG.find((g) => g.target === target)?.label ?? target;
}
