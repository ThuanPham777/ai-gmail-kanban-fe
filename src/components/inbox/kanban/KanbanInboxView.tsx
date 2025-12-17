/**
 * KanbanInboxView Component
 *
 * Displays emails in a kanban board layout with drag-and-drop functionality.
 * Features:
 * - Drag-and-drop cards between columns (To Do, In Progress, Done)
 * - Auto-summarization with AI
 * - Snooze functionality
 * - Filtering by sender and unread status
 * - Sorting by date (newest/oldest)
 * - Optimistic updates for instant UI feedback
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getKanbanBoard, type KanbanBoardData } from '@/lib/api';
import { KanbanBoard } from './KanbanBoard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_KANBAN_STATUSES,
  KANBAN_PER_PAGE,
  MAX_AUTO_SUMMARIZE_ITEMS,
  MESSAGE_DISPLAY_DURATION,
  type EmailStatus,
} from '../../../constants/constants.kanban';
import { KanbanEmailDetailDialog } from './KanbanEmailDetailDialog';
import { useKanbanMutations } from '../../../hooks/kanban/useKanbanMutations';
import { useKanbanFilters } from '../../../hooks/kanban/useKanbanFilters';
import { needsSummary } from '../../../utils/kanbanUtils';

/**
 * Main kanban inbox view component
 * @param labelId - Gmail label ID (defaults to INBOX)
 */
export function KanbanInboxView({ labelId }: { labelId?: string }) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const statuses = DEFAULT_KANBAN_STATUSES;
  const keyLabel = labelId ?? 'INBOX';
  const queryKey = ['kanban-board', keyLabel];

  // Loading states for individual cards
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [summarizingMap, setSummarizingMap] = useState<Record<string, boolean>>(
    {}
  );

  // Mail detail dialog state
  const [openMailId, setOpenMailId] = useState<string | null>(null);
  const [openMail, setOpenMail] = useState(false);

  // Fetch kanban board data with infinite scroll
  const boardQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      getKanbanBoard(labelId, pageParam, KANBAN_PER_PAGE),
    getNextPageParam: (lastPage) => lastPage.meta?.nextPageToken ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  // Merge all pages into a single board
  const board: KanbanBoardData | undefined = useMemo(() => {
    if (!boardQuery.data?.pages) return undefined;

    const merged: KanbanBoardData = {
      INBOX: [],
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
      SNOOZED: [],
    };

    // Combine all pages
    for (const page of boardQuery.data.pages) {
      for (const status of statuses) {
        merged[status].push(...(page.data[status] || []));
      }
    }

    return merged;
  }, [boardQuery.data?.pages, statuses]);

  // Reset loading maps when label changes
  useEffect(() => {
    setLoadingMap({});
    setSummarizingMap({});
  }, [keyLabel]);

  /**
   * Shows a temporary message to the user
   */
  const show = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), MESSAGE_DISPLAY_DURATION);
  };

  // Use custom mutations hook
  const { moveMutation, snoozeMutation, summarizeMutation } =
    useKanbanMutations({
      queryKey,
      statuses,
      onSuccess: show,
      onError: show,
      onLoadingChange: (messageId, isLoading) => {
        setLoadingMap((m) => ({ ...m, [messageId]: isLoading }));
      },
      onSummarizingChange: (messageId, isSummarizing) => {
        setSummarizingMap((m) => ({ ...m, [messageId]: isSummarizing }));
      },
    });

  /**
   * Handles moving a card to a different column
   */
  const onMoveItem = (messageId: string, status: EmailStatus) =>
    moveMutation.mutate({ messageId, status });

  /**
   * Handles snoozing an email until a specific date
   */
  const onSnoozeItem = (messageId: string, untilIso: string) =>
    snoozeMutation.mutate({ messageId, until: untilIso });

  /**
   * Opens email detail dialog
   */
  const onOpenMail = (emailId: string) => {
    setOpenMailId(emailId);
    setOpenMail(true);
  };

  /**
   * Loads more items when user scrolls to bottom
   */
  const loadMore = () => {
    if (boardQuery.hasNextPage && !boardQuery.isFetchingNextPage) {
      boardQuery.fetchNextPage();
    }
  };

  // Use custom filters hook
  const {
    processedBoard,
    flatItems,
    sortOrder,
    setSortOrder,
    filterUnread,
    setFilterUnread,
    filterSender,
    setFilterSender,
  } = useKanbanFilters({ board, statuses });

  /**
   * Auto-summarize items that don't have summaries yet
   * Limited to prevent overwhelming the AI service
   */
  const requestedSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!flatItems.length) return;

    // Filter items that need summaries and limit the batch
    const need = flatItems.filter(needsSummary);
    const limited = need.slice(0, MAX_AUTO_SUMMARIZE_ITEMS);

    // Request summaries for items not yet requested
    for (const item of limited) {
      if (requestedSet.current.has(item.messageId)) continue;
      requestedSet.current.add(item.messageId);
      summarizeMutation.mutate({ messageId: item.messageId });
    }
  }, [flatItems, summarizeMutation]);

  return (
    <div className='space-y-4'>
      {msg && (
        <Alert>
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}

      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs uppercase tracking-[0.3em] text-muted-foreground'>
            Kanban mode
          </p>
          <h2 className='text-lg font-semibold'>Email task board</h2>
        </div>

        <div className='flex items-center gap-3'>
          <label className='text-sm'>
            <span className='mr-2 text-xs text-muted-foreground'>Sort</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className='rounded-md border bg-input/50 px-2 py-1 text-sm'
            >
              <option value='newest'>Date: Newest first</option>
              <option value='oldest'>Date: Oldest first</option>
            </select>
          </label>

          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={filterUnread}
              onChange={(e) => setFilterUnread(e.target.checked)}
            />
            <span className='text-xs text-muted-foreground'>
              Show only Unread
            </span>
          </label>

          <input
            placeholder='Filter sender...'
            value={filterSender}
            onChange={(e) => setFilterSender(e.target.value)}
            className='rounded-md border bg-input/50 px-2 py-1 text-sm'
          />

          <Button
            size='sm'
            variant='outline'
            onClick={() => queryClient.invalidateQueries({ queryKey })}
            className='gap-2'
          >
            <RefreshCcw className='h-4 w-4' />
            Refresh
          </Button>
        </div>
      </div>

      {boardQuery.isLoading && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading board…
        </div>
      )}

      {processedBoard && (
        <>
          <KanbanBoard
            board={processedBoard}
            onMoveItem={onMoveItem}
            onSnoozeItem={onSnoozeItem}
            onOpenMail={onOpenMail}
            loadingMap={loadingMap}
            summarizingMap={summarizingMap}
            statuses={statuses}
          />

          {/* Load more button */}
          {boardQuery.hasNextPage && (
            <div className='flex justify-center pt-4'>
              <Button
                onClick={loadMore}
                disabled={boardQuery.isFetchingNextPage}
                variant='outline'
                className='gap-2'
              >
                {boardQuery.isFetchingNextPage ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Loading more...
                  </>
                ) : (
                  'Load more emails'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Mail detail dialog */}
      <KanbanEmailDetailDialog
        emailId={openMailId}
        open={openMail}
        onOpenChange={setOpenMail}
      />
    </div>
  );
}
