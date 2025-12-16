// src/pages/inbox/components/kanban/KanbanInboxView.tsx
import { useMemo, useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getKanbanBoard,
  updateKanbanStatus,
  snoozeKanbanItem,
  summarizeKanbanItem,
  type KanbanBoardData,
  type KanbanEmailItem,
} from '@/lib/api';
import { KanbanBoard } from './KanbanBoard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_KANBAN_STATUSES, type EmailStatus } from './constants';
import { KanbanEmailDetailDialog } from './KanbanEmailDetailDialog';

/** ---------- optimistic helpers ---------- */
function patchBoardMove(
  board: KanbanBoardData,
  messageId: string,
  toStatus: EmailStatus,
  statuses: EmailStatus[]
): KanbanBoardData {
  const next: any = { ...board };
  let moving: KanbanEmailItem | null = null;

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

  if (moving) {
    moving = { ...moving, status: toStatus } as any;
    next[toStatus] = [moving, ...(next[toStatus] ?? [])];
  }

  return next;
}

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

/** ---------- view ---------- */
export function KanbanInboxView({ labelId }: { labelId?: string }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const statuses = DEFAULT_KANBAN_STATUSES;
  const keyLabel = labelId ?? 'INBOX';
  const queryKey = ['kanban-board', keyLabel];

  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [summarizingMap, setSummarizingMap] = useState<Record<string, boolean>>(
    {}
  );

  // Mail detail dialog state
  const [openMailId, setOpenMailId] = useState<string | null>(null);
  const [openMail, setOpenMail] = useState(false);

  const boardQuery = useQuery({
    queryKey,
    queryFn: () => getKanbanBoard(labelId),
  });

  useEffect(() => {
    setLoadingMap({});
    setSummarizingMap({});
  }, [keyLabel]);

  const show = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2000);
  };

  /** ---------- Optimistic Move ---------- */
  const moveMutation = useMutation({
    mutationFn: ({
      messageId,
      status,
    }: {
      messageId: string;
      status: EmailStatus;
    }) => updateKanbanStatus(messageId, status),

    onMutate: async ({ messageId, status }) => {
      setLoadingMap((m) => ({ ...m, [messageId]: true }));
      await qc.cancelQueries({ queryKey });

      const prev = qc.getQueryData<any>(queryKey);

      if (prev?.data) {
        const optimistic = patchBoardMove(
          prev.data,
          messageId,
          status,
          statuses
        );
        qc.setQueryData(queryKey, { ...prev, data: optimistic });
      }

      return { prev, messageId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      show('Update failed');
    },

    onSuccess: () => show('Status updated'),

    onSettled: (_d, _e, vars) => {
      if (vars?.messageId) {
        setLoadingMap((m) => ({ ...m, [vars.messageId]: false }));
      }
      qc.invalidateQueries({ queryKey });
    },
  });

  /** ---------- Snooze ---------- */
  const snoozeMutation = useMutation({
    mutationFn: ({ messageId, until }: { messageId: string; until: string }) =>
      snoozeKanbanItem(messageId, until),

    onMutate: ({ messageId }) => {
      setLoadingMap((m) => ({ ...m, [messageId]: true }));
    },

    onSuccess: () => show('Snoozed'),

    onSettled: (_d, _e, vars) => {
      if (vars?.messageId) {
        setLoadingMap((m) => ({ ...m, [vars.messageId]: false }));
      }
      qc.invalidateQueries({ queryKey });
    },
  });

  /** ---------- Summarize (auto) ---------- */
  const summarizeMutation = useMutation({
    mutationFn: ({ messageId }: { messageId: string }) =>
      summarizeKanbanItem(messageId),

    onMutate: ({ messageId }) => {
      setSummarizingMap((m) => ({ ...m, [messageId]: true }));
    },

    onSuccess: (resp: any, vars) => {
      const summary = resp?.data?.summary ?? resp?.summary;
      if (!summary) return;

      const prev = qc.getQueryData<any>(queryKey);
      if (prev?.data) {
        const patched = patchBoardSummary(
          prev.data,
          vars.messageId,
          summary,
          statuses
        );
        qc.setQueryData(queryKey, { ...prev, data: patched });
      }
    },

    onSettled: (_d, _e, vars) => {
      if (vars?.messageId) {
        setSummarizingMap((m) => ({ ...m, [vars.messageId]: false }));
      }
    },
  });

  const onMoveItem = (messageId: string, status: EmailStatus) =>
    moveMutation.mutate({ messageId, status });

  const onSnoozeItem = (messageId: string, untilIso: string) =>
    snoozeMutation.mutate({ messageId, until: untilIso });

  const onOpenMail = (emailId: string) => {
    setOpenMailId(emailId);
    setOpenMail(true);
  };

  const board: KanbanBoardData | undefined = boardQuery.data?.data;

  // Sorting & filtering state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterSender, setFilterSender] = useState('');

  const processedBoard = useMemo(() => {
    if (!board) return undefined;

    const out: any = {};
    for (const st of statuses) {
      let items: KanbanEmailItem[] = (board as any)[st] ?? [];

      // filtering: unread -> status must be INBOX
      if (filterUnread) {
        items = items.filter((i) => i.status === 'INBOX');
      }

      // filter by sender substring
      if (filterSender && filterSender.trim()) {
        const s = filterSender.trim().toLowerCase();
        items = items.filter((i) => {
          return (
            (i.senderName ?? '').toLowerCase().includes(s) ||
            (i.senderEmail ?? '').toLowerCase().includes(s)
          );
        });
      }

      // sort by createdAt (fallback to updatedAt)
      items = items.slice().sort((a, b) => {
        const ta = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
        const tb = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
        return sortOrder === 'newest' ? tb - ta : ta - tb;
      });

      out[st] = items;
    }

    return out as KanbanBoardData;
  }, [board, statuses, sortOrder, filterUnread, filterSender]);

  /** ---- AUTO summarize when board loads ---- */
  const requestedSet = useRef<Set<string>>(new Set());

  const flatItems = useMemo(() => {
    if (!board) return [];
    return statuses.flatMap((st) => (board as any)[st] ?? []);
  }, [board, statuses]);

  useEffect(() => {
    if (!flatItems.length) return;

    const need = flatItems.filter((i) => !i.summary);
    const limited = need.slice(0, 12);

    for (const it of limited) {
      if (requestedSet.current.has(it.messageId)) continue;
      requestedSet.current.add(it.messageId);
      summarizeMutation.mutate({ messageId: it.messageId });
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
            onClick={() => qc.invalidateQueries({ queryKey })}
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
        <KanbanBoard
          board={processedBoard}
          onMoveItem={onMoveItem}
          onSnoozeItem={onSnoozeItem}
          onOpenMail={onOpenMail}
          loadingMap={loadingMap}
          summarizingMap={summarizingMap}
          statuses={statuses}
        />
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
