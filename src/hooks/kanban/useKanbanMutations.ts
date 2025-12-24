/**
 * Kanban Mutations Hook
 *
 * Centralized hook for all kanban-related mutations (move, snooze, summarize).
 * Implements optimistic updates with rollback on error.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateKanbanStatus,
  snoozeKanbanItem,
  summarizeKanbanItem,
  type KanbanBoardData,
  type KanbanEmailItem,
  type EmailStatus,
} from '@/lib/api';

interface UseKanbanMutationsProps {
  queryKey: readonly string[];
  statuses: EmailStatus[];
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onSnoozed?: (messageId: string) => void;
  onLoadingChange?: (messageId: string, isLoading: boolean) => void;
  onSummarizingChange?: (messageId: string, isSummarizing: boolean) => void;
}

/**
 * Optimistically patches board data when moving an item
 * Removes item from old column and adds to new column
 */
function patchBoardMove(
  board: KanbanBoardData,
  messageId: string,
  toStatus: EmailStatus,
  statuses: EmailStatus[]
): KanbanBoardData {
  const next: any = { ...board };
  let moving: KanbanEmailItem | null = null;

  // Find and remove item from current column
  for (const st of statuses) {
    const arr: KanbanEmailItem[] = next[st] ?? [];
    const idx = arr.findIndex((i) => i.messageId === messageId);
    if (idx >= 0) {
      moving = arr[idx];
      next[st] = [...arr.slice(0, idx), ...arr.slice(idx + 1)];
    } else {
      next[st] = arr;
    }
  }

  // Add item to new column at the top
  if (moving) {
    moving = { ...moving, status: toStatus } as any;
    next[toStatus] = [moving, ...(next[toStatus] ?? [])];
  }

  return next;
}

/**
 * Optimistically patches board data when summarizing an item
 * Updates the summary field for a specific item
 */
function patchBoardSummary(
  board: KanbanBoardData,
  messageId: string,
  summary: string,
  statuses: EmailStatus[]
): KanbanBoardData {
  const next: any = { ...board };
  for (const st of statuses) {
    const arr: KanbanEmailItem[] = next[st] ?? [];
    next[st] = arr.map((i) =>
      i.messageId === messageId ? ({ ...i, summary } as any) : i
    );
  }
  return next;
}

/**
 * Optimistically removes an item from the board (used for snooze)
 */
function patchBoardRemove(
  board: KanbanBoardData,
  messageId: string,
  statuses: EmailStatus[]
): KanbanBoardData {
  const next: any = { ...board };
  for (const st of statuses) {
    const arr: KanbanEmailItem[] = next[st] ?? [];
    next[st] = arr.filter((i) => i.messageId !== messageId);
  }
  return next;
}

/**
 * Hook for managing kanban board mutations
 * @param queryKey - React Query cache key for the board
 * @param statuses - Array of valid status values
 * @param onSuccess - Callback for successful mutations
 * @param onError - Callback for failed mutations
 * @param onLoadingChange - Callback for loading state changes
 * @param onSummarizingChange - Callback for summarizing state changes
 */
export function useKanbanMutations({
  queryKey,
  statuses,
  onSuccess,
  onError,
  onSnoozed,
  onLoadingChange,
  onSummarizingChange,
}: UseKanbanMutationsProps) {
  const queryClient = useQueryClient();

  /**
   * Move mutation - Updates kanban card status/column
   * Implements optimistic update with rollback on error
   */
  const moveMutation = useMutation({
    mutationFn: ({
      messageId,
      status,
      gmailLabel,
    }: {
      messageId: string;
      status: EmailStatus;
      gmailLabel?: string;
    }) => updateKanbanStatus(messageId, status, gmailLabel),

    onMutate: async ({ messageId, status }) => {
      // Set loading state
      onLoadingChange?.(messageId, true);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current data for rollback
      const prev = queryClient.getQueryData<any>(queryKey);

      // Optimistically update cache (infinite query pages structure)
      if (prev?.pages) {
        const updatedPages = prev.pages.map((page: any) => {
          if (page.data?.data) {
            const optimisticData = patchBoardMove(
              page.data.data,
              messageId,
              status,
              statuses
            );
            return { ...page, data: { ...page.data, data: optimisticData } };
          }
          return page;
        });
        queryClient.setQueryData(queryKey, { ...prev, pages: updatedPages });
      }

      return { prev, messageId };
    },

    onError: (_err, _vars, context) => {
      // Rollback to previous state
      if (context?.prev) {
        queryClient.setQueryData(queryKey, context.prev);
      }
      onError?.('Failed to update status');
    },

    onSuccess: () => {
      onSuccess?.('Status updated');
    },

    onSettled: (_data, _error, variables) => {
      // Clear loading state
      if (variables?.messageId) {
        onLoadingChange?.(variables.messageId, false);
      }
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Snooze mutation - Snoozes a kanban item until specified date
   */
  const snoozeMutation = useMutation({
    mutationFn: ({ messageId, until }: { messageId: string; until: string }) =>
      snoozeKanbanItem(messageId, until),

    onMutate: async ({ messageId }) => {
      onLoadingChange?.(messageId, true);

      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<any>(queryKey);

      // Optimistically remove from board immediately
      if (prev?.pages) {
        const updatedPages = prev.pages.map((page: any) => {
          if (page.data?.data) {
            const optimisticData = patchBoardRemove(
              page.data.data,
              messageId,
              statuses
            );
            return { ...page, data: { ...page.data, data: optimisticData } };
          }
          return page;
        });
        queryClient.setQueryData(queryKey, { ...prev, pages: updatedPages });
      }

      return { prev, messageId };
    },

    onSuccess: (_data, variables) => {
      if (variables?.messageId) {
        onSnoozed?.(variables.messageId);
      }
      onSuccess?.('Email snoozed');
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKey, context.prev);
      }
      onError?.('Failed to snooze email');
    },

    onSettled: (_data, _error, variables) => {
      if (variables?.messageId) {
        onLoadingChange?.(variables.messageId, false);
      }
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Summarize mutation - Generates AI summary for kanban item
   * Updates cache optimistically when summary is received
   */
  const summarizeMutation = useMutation({
    mutationFn: ({ messageId }: { messageId: string }) =>
      summarizeKanbanItem(messageId),

    onMutate: ({ messageId }) => {
      onSummarizingChange?.(messageId, true);
    },

    onSuccess: (response: any, variables) => {
      const summary = response?.data?.summary ?? response?.summary;
      if (!summary) return;

      // Optimistically update summary in cache
      const prev = queryClient.getQueryData<any>(queryKey);
      if (prev?.pages) {
        const updatedPages = prev.pages.map((page: any) => {
          if (!page?.data?.data) return page;
          const patchedData = patchBoardSummary(
            page.data.data,
            variables.messageId,
            summary,
            statuses
          );
          return { ...page, data: { ...page.data, data: patchedData } };
        });
        queryClient.setQueryData(queryKey, { ...prev, pages: updatedPages });
        return;
      }

      // Fallback for non-infinite queries
      if (prev?.data) {
        const patched = patchBoardSummary(
          prev.data,
          variables.messageId,
          summary,
          statuses
        );
        queryClient.setQueryData(queryKey, { ...prev, data: patched });
      }
    },

    onError: () => {
      onError?.('Failed to generate summary');
    },

    onSettled: (_data, _error, variables) => {
      if (variables?.messageId) {
        onSummarizingChange?.(variables.messageId, false);
      }
    },
  });

  return {
    moveMutation,
    snoozeMutation,
    summarizeMutation,
  };
}
