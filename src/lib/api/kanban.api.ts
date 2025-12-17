import apiClient from './client';
import type {
  KanbanBoardResponse,
  EmailStatus,
  KanbanEmailItem,
} from './types/kanban.types';

/**
 * Fetches kanban board with all email columns
 * Supports pagination using token-based pagination similar to Gmail
 * @param label - Optional label filter
 * @param pageToken - Token from previous response for next page
 * @param pageSize - Number of emails per column per request (default: 20)
 */
export const getKanbanBoard = async (
  label?: string,
  pageToken?: string,
  pageSize = 20
): Promise<KanbanBoardResponse> => {
  const res = await apiClient.get<KanbanBoardResponse>('/api/kanban/board', {
    params: {
      ...(label ? { label } : {}),
      ...(pageToken ? { pageToken } : {}),
      limit: pageSize,
    },
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

export const semanticSearchKanban = async (query: string, limit?: number) => {
  const res = await apiClient.post<{ status: 'success'; data: any[] }>(
    `/api/kanban/search/semantic`,
    { query, limit }
  );
  return res.data;
};

export const getSearchSuggestions = async (q: string, limit?: number) => {
  const res = await apiClient.get<{
    status: 'success';
    data: Array<{ type: 'contact' | 'keyword'; text: string; value: string }>;
  }>(`/api/kanban/search/suggestions`, { params: { q, limit } });
  return res.data;
};

export const generateEmbedding = async (messageId: string) => {
  const safeId = encodeURIComponent(messageId);
  const res = await apiClient.post<{
    status: 'success';
    data: { success: boolean };
  }>(`/api/kanban/items/${safeId}/generate-embedding`);
  return res.data;
};
