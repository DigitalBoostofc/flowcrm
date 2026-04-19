import type { FilterCondition } from '@/api/automations';

export type FilterTarget = FilterCondition['target'];
export type FilterOperator = FilterCondition['operator'];

export interface FilterFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number';
}

export interface FilterFieldGroup {
  target: FilterTarget;
  label: string;
  fields: FilterFieldDef[];
}

export const FILTER_CATALOG: FilterFieldGroup[] = [
  {
    target: 'lead',
    label: 'Negócio',
    fields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'value', label: 'Valor', type: 'number' },
      { key: 'ranking', label: 'Ranking', type: 'number' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'notes', label: 'Observações', type: 'text' },
    ],
  },
  {
    target: 'contact',
    label: 'Pessoa',
    fields: [
      { key: 'name', label: 'Nome', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'text' },
      { key: 'cpf', label: 'CPF', type: 'text' },
      { key: 'role', label: 'Cargo', type: 'text' },
    ],
  },
  {
    target: 'company',
    label: 'Empresa',
    fields: [
      { key: 'name', label: 'Nome', type: 'text' },
      { key: 'cnpj', label: 'CNPJ', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'telefone', label: 'Telefone', type: 'text' },
    ],
  },
];

export const OPERATORS: { value: FilterOperator; label: string; needsValue: boolean }[] = [
  { value: 'eq', label: 'é igual a', needsValue: true },
  { value: 'neq', label: 'é diferente de', needsValue: true },
  { value: 'contains', label: 'contém', needsValue: true },
  { value: 'not_contains', label: 'não contém', needsValue: true },
  { value: 'gt', label: 'maior que', needsValue: true },
  { value: 'lt', label: 'menor que', needsValue: true },
  { value: 'gte', label: 'maior ou igual a', needsValue: true },
  { value: 'lte', label: 'menor ou igual a', needsValue: true },
  { value: 'empty', label: 'está vazio', needsValue: false },
  { value: 'not_empty', label: 'não está vazio', needsValue: false },
];

export function findFieldDef(target: FilterTarget, key: string): FilterFieldDef | undefined {
  return FILTER_CATALOG.find((g) => g.target === target)?.fields.find((f) => f.key === key);
}

export function findGroupLabel(target: FilterTarget): string {
  return FILTER_CATALOG.find((g) => g.target === target)?.label ?? target;
}
