import { api } from './client';
import type { Contact, Lead } from '@/types/api';

export interface SearchResults {
  contacts: Contact[];
  leads: Lead[];
}

export const globalSearch = (q: string): Promise<SearchResults> => {
  return api.get<SearchResults>('/search', { params: { q } }).then((res) => res.data);
};
