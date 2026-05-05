import { api } from './client';
import type { Task, TaskStatus, TaskType, TaskTargetType, TaskAttachment } from '@/types/api';

export interface ListTasksParams {
  status?: TaskStatus;
  type?: TaskType;
  assigneeId?: string;
  targetType?: TaskTargetType;
  targetId?: string;
  range?: 'today' | 'week' | 'all';
  dueFrom?: string;
  dueTo?: string;
}

export async function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks', { params });
  return res.data;
}

export async function getTask(id: string): Promise<Task> {
  const res = await api.get<Task>(`/tasks/${id}`);
  return res.data;
}

export interface CreateTaskInput {
  type: TaskType;
  description: string;
  dueDate?: string | null;
  responsibleIds?: string[];
  targetType?: TaskTargetType;
  targetId?: string;
  targetLabel?: string;
  location?: string;
  attachments?: TaskAttachment[];
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  const payload = { ...data };
  if (!payload.dueDate) delete payload.dueDate;
  const res = await api.post<Task>('/tasks', payload);
  return res.data;
}

export async function updateTask(id: string, data: Partial<CreateTaskInput>): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${id}`, data);
  return res.data;
}

export async function completeTask(id: string): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${id}/complete`);
  return res.data;
}

export async function cancelTask(id: string): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${id}/cancel`);
  return res.data;
}

export async function reopenTask(id: string): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${id}/reopen`);
  return res.data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
