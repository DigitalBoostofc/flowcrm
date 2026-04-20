import type { ReactNode } from 'react';

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
}

export interface ColumnPrefs {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}
