import apiClient from './client';
import type {
  KanbanBoardResponse,
  EmailStatus,
  KanbanEmailItem,
} from './types/kanban.types';

export const getKanbanBoard = async (
  label?: string
): Promise<KanbanBoardResponse> => {
  const res = await apiClient.get<KanbanBoardResponse>('/api/kanban/board', {
    params: label ? { label } : undefined,
  });
  return res.data;
};

export const updateKanbanStatus = async (
  messageId: string,
  status: EmailStatus
) => {
  const safeId = encodeURIComponent(messageId);
  const res = await apiClient.patch<{
    status: 'success';
    data: KanbanEmailItem;
  }>(`/api/kanban/items/${safeId}/status`, { status });
  return res.data;
};

export const snoozeKanbanItem = async (messageId: string, until: string) => {
  const safeId = encodeURIComponent(messageId);
  const res = await apiClient.post<{
    status: 'success';
    data: KanbanEmailItem;
  }>(`/api/kanban/items/${safeId}/snooze`, { until });
  return res.data;
};

export const summarizeKanbanItem = async (messageId: string) => {
  const safeId = encodeURIComponent(messageId);
  const res = await apiClient.post<{
    status: 'success';
    data: { summary: string; cached: boolean };
  }>(`/api/kanban/items/${safeId}/summarize`);
  return res.data;
};

export const searchKanban = async (q: string) => {
  const res = await apiClient.get<{ status: 'success'; data: any[] }>(
    `/api/kanban/search`,
    { params: { q } }
  );
  return res.data;
};
