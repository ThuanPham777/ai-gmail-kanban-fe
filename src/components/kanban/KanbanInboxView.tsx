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
import { useInfiniteQuery } from '@tanstack/react-query';
import { getKanbanBoard, type KanbanBoardData } from '@/lib/api';
import { KanbanBoard } from './KanbanBoard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanSettingsModal } from './KanbanSettingsModal';
import { useKanbanConfig } from '@/hooks/kanban/useKanbanConfig';
import {
  KANBAN_PER_PAGE,
  MAX_AUTO_SUMMARIZE_ITEMS,
  MESSAGE_DISPLAY_DURATION,
  type EmailStatus,
} from '../../constants/constants.kanban';
import { useKanbanMutations } from '../../hooks/kanban/useKanbanMutations';
import { useKanbanFilters } from '../../hooks/kanban/useKanbanFilters';
import { needsSummary } from '../../utils/kanbanUtils';
import { getGmailUrl } from '@/utils/emailUtils';
import { useAuth } from '@/context/AuthContext';

/**
 * Main kanban inbox view component
 * @param labelId - Gmail label ID (defaults to INBOX)
 */
export function KanbanInboxView({ labelId }: { labelId?: string }) {
  const { user } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Track snoozed items so we can notify when they reappear
  const snoozedIdsRef = useRef<Set<string>>(new Set());
  const [snoozedCount, setSnoozedCount] = useState(0);

  // Dynamic column configuration from backend
  const {
    columns: localColumns,
    addColumn: addColumnBase,
    updateColumn: updateColumnBase,
    deleteColumn: deleteColumnBase,
    reorderColumns: reorderColumnsBase,
    resetToDefault: resetToDefaultBase,
    isLoading: configLoading,
    isSyncing,
  } = useKanbanConfig();

  // Wrap column operations (hook already invalidates board query)
  const addColumn = async (name: string, gmailLabel?: string) => {
    const result = await addColumnBase(name, gmailLabel);
    return result;
  };

  const updateColumn = async (id: string, updates: Partial<any>) => {
    await updateColumnBase(id, updates);
  };

  const deleteColumn = async (id: string) => {
    await deleteColumnBase(id);
  };

  const reorderColumns = async (cols: any[]) => {
    await reorderColumnsBase(cols);
  };

  const resetToDefault = async () => {
    await resetToDefaultBase();
  };

  const keyLabel = labelId ?? 'INBOX';
  const queryKey = ['kanban-board', keyLabel];

  // Loading states for individual cards
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [summarizingMap, setSummarizingMap] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch kanban board data with infinite scroll
  const boardQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      getKanbanBoard(labelId, pageParam, KANBAN_PER_PAGE),
    getNextPageParam: (lastPage) =>
      lastPage.data.meta?.nextPageToken ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !configLoading, // Wait for config to load first
    // Only poll while we have pending snoozed emails to detect wake-ups.
    refetchInterval: snoozedCount > 0 ? 30_000 : false,
  });

  // Get columns from API response (first page) or fallback to local
  const columns = useMemo(() => {
    const firstPage = boardQuery.data?.pages?.[0];
    return firstPage?.data.columns || localColumns;
  }, [boardQuery.data?.pages, localColumns]);

  // Get warnings from API response
  const warnings = useMemo(() => {
    const firstPage = boardQuery.data?.pages?.[0];
    return firstPage?.data.warnings || [];
  }, [boardQuery.data?.pages]);

  // Use column IDs as statuses
  const statuses = useMemo(
    () => columns.map((col) => col.id as EmailStatus),
    [columns]
  );

  // Merge all pages into a single board
  const board: KanbanBoardData | undefined = useMemo(() => {
    if (!boardQuery.data?.pages) return undefined;

    const merged: KanbanBoardData = {};

    // Initialize dynamic status arrays
    for (const status of statuses) {
      merged[status] = [];
    }

    // Combine all pages
    for (const page of boardQuery.data.pages) {
      for (const status of statuses) {
        if (page.data.data[status]) {
          merged[status].push(...page.data.data[status]);
        }
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
      onSnoozed: (messageId) => {
        snoozedIdsRef.current.add(messageId);
        setSnoozedCount(snoozedIdsRef.current.size);
      },
      onLoadingChange: (messageId, isLoading) => {
        setLoadingMap((m) => ({ ...m, [messageId]: isLoading }));
      },
      onSummarizingChange: (messageId, isSummarizing) => {
        setSummarizingMap((m) => ({ ...m, [messageId]: isSummarizing }));
      },
    });

  // Notify when a previously snoozed email appears back on the board
  useEffect(() => {
    if (!board || snoozedIdsRef.current.size === 0) return;

    const presentIds = new Set<string>();
    for (const status of statuses) {
      const items = board[status] ?? [];
      for (const it of items) {
        if (it?.messageId) presentIds.add(it.messageId);
      }
    }

    let woke = 0;
    for (const id of Array.from(snoozedIdsRef.current)) {
      if (presentIds.has(id)) {
        snoozedIdsRef.current.delete(id);
        woke += 1;
      }
    }

    if (woke > 0) {
      show(
        woke === 1 ? 'Snoozed email is back' : `${woke} snoozed emails are back`
      );
      setSnoozedCount(snoozedIdsRef.current.size);
    }
  }, [board, statuses]);

  /**
   * Handles moving a card to a different column
   * Automatically syncs Gmail labels if configured
   */
  const onMoveItem = (messageId: string, status: EmailStatus) => {
    const column = columns.find((col) => col.id === status);
    moveMutation.mutate({
      messageId,
      status,
      gmailLabel: column?.gmailLabel,
    });
  };

  /**
   * Handles snoozing an email until a specific date
   */
  const onSnoozeItem = (messageId: string, untilIso: string) =>
    snoozeMutation.mutate({ messageId, until: untilIso });

  /**
   * Opens email in Gmail in new tab
   */
  const onOpenMail = (messageId: string) => {
    const gmailUrl = getGmailUrl(messageId, user?.email);
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Auto-load more when scrolling to bottom (intersection observer)
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
    filterAttachments,
    setFilterAttachments,
    hasActiveFilter,
  } = useKanbanFilters({ board, statuses });

  // Count filtered items to check if we should show "no results" message
  const filteredItemsCount = useMemo(() => {
    if (!processedBoard) return 0;
    return statuses.reduce(
      (sum, st) => sum + ((processedBoard as any)[st]?.length || 0),
      0
    );
  }, [processedBoard, statuses]);

  // Auto-load more when scrolling to bottom (intersection observer)
  // Only trigger if: has next page AND not currently fetching AND NO filter is active
  // Filters are client-side, so loading more data won't help when filtering
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't load more if any filter is active (filters are client-side)
        const shouldLoad =
          entries[0].isIntersecting &&
          boardQuery.hasNextPage &&
          !boardQuery.isFetchingNextPage &&
          !hasActiveFilter;

        if (shouldLoad) {
          console.log('[Kanban] Loading more emails...');
          boardQuery.fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [boardQuery, hasActiveFilter, filteredItemsCount]);

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
      // Skip items without messageId
      if (!item.messageId) continue;
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

      {/* Show warnings for invalid Gmail labels */}
      {warnings.length > 0 && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            <div className='font-semibold mb-1'>
              Column Configuration Issues:
            </div>
            <ul className='list-disc list-inside space-y-1'>
              {warnings.map((w: any, i: number) => (
                <li
                  key={i}
                  className='text-sm'
                >
                  {w.message}
                </li>
              ))}
            </ul>
            <Button
              size='sm'
              variant='outline'
              className='mt-2'
              onClick={() => setSettingsOpen(true)}
            >
              Fix in Settings
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className='flex items-center justify-between'>
        <div>
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
              <option value='sender-asc'>Sender: A-Z</option>
              <option value='sender-desc'>Sender: Z-A</option>
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

          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={filterAttachments}
              onChange={(e) => setFilterAttachments(e.target.checked)}
            />
            <span className='text-xs text-muted-foreground'>
              Has attachments
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
            onClick={() => setSettingsOpen(true)}
            className='gap-2'
          >
            <Settings className='h-4 w-4' />
            Settings
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
            columnConfig={columns}
          />

          {/* Show "no results" message when filter is active but no items match */}
          {hasActiveFilter && filteredItemsCount === 0 && (
            <div className='flex items-center justify-center py-8 text-muted-foreground'>
              <p>No emails match your filter criteria</p>
            </div>
          )}

          {/* Sentinel for auto-loading more - only show when NO filter is active */}
          {!hasActiveFilter && (
            <div
              ref={loadMoreRef}
              className='h-20 flex items-center justify-center'
            >
              {boardQuery.isFetchingNextPage && (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading more emails...
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Kanban Settings Modal */}
      <KanbanSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        columns={columns}
        onAddColumn={addColumn}
        onUpdateColumn={updateColumn}
        onDeleteColumn={deleteColumn}
        onReorderColumns={reorderColumns}
        onResetToDefault={resetToDefault}
        isSyncing={isSyncing}
      />
    </div>
  );
}
