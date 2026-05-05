import { api } from './client';

export interface InboxTag {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
}

export const listInboxTags = (): Promise<InboxTag[]> =>
  api.get<InboxTag[]>('/inbox-tags').then((r) => r.data);

export const createInboxTag = (dto: { name: string; color: string }): Promise<InboxTag> =>
  api.post<InboxTag>('/inbox-tags', dto).then((r) => r.data);

export const updateInboxTag = (id: string, dto: { name?: string; color?: string }): Promise<InboxTag> =>
  api.patch<InboxTag>(`/inbox-tags/${id}`, dto).then((r) => r.data);

export const deleteInboxTag = (id: string): Promise<void> =>
  api.delete(`/inbox-tags/${id}`).then(() => undefined);

export const setConversationInboxTag = (conversationId: string, inboxTagId: string | null): Promise<{ id: string; inboxTagId: string | null }> =>
  api.patch(`/conversations/${conversationId}/inbox-tag`, { inboxTagId }).then((r) => r.data);
