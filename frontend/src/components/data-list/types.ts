import type { ReactNode } from 'react';

export type AggregateMode = 'sum' | 'avg' | 'min' | 'max';

export interface ColumnDef<T> {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  required?: boolean;
  hiddenByDefault?: boolean;
  render: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  getNumericValue?: (row: T) => number | null | undefined;
  formatAggregate?: (value: number) => string;
}

export interface ColumnPrefs {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}
