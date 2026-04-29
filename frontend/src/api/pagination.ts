export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export const buildPaginationQuery = (p?: PaginationParams): Record<string, string> => {
  const out: Record<string, string> = {};
  if (p?.limit != null) out.limit = String(p.limit);
  if (p?.offset != null) out.offset = String(p.offset);
  return out;
};
