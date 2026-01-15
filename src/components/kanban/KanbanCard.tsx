/**
 * KanbanCard Component
 *
 * Individual draggable email card in kanban board.
 * Features:
 * - Drag handle for repositioning
 * - Sender avatar with initials
 * - AI summary with loading state
 * - Snooze functionality
 * - Click to open email details
 */

import type React from 'react';
import type { KanbanEmailItem } from '@/lib/api';
import { Loader2, GripVertical, MailOpen, Sparkles } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SnoozePopover } from './SnoozePopover';
import { Button } from '@/components/ui/button';

/**
 * Generates initials from sender name
 * @param name - Sender's full name
 * @returns Uppercase initials (max 2 letters)
 */
function initials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase() || 'U';
}

/**
 * Formats timestamp to relative time (e.g., "2 hours ago")
 * @param dateString - ISO date string
 * @returns Formatted relative time
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Kanban email card component
 * @param item - Email item data
 * @param onSnooze - Callback when snoozed
 * @param onOpenMail - Callback when clicked
 * @param isUpdating - Loading state for status updates
 * @param isSummarizing - Loading state for AI summary generation
 */
export function KanbanCard({
  item,
  onSnooze,
  onOpenMail,
  isUpdating,
  isSummarizing,
}: {
  item: KanbanEmailItem;
  onSnooze: (untilIso: string) => void;
  onOpenMail?: (emailId: string) => void;
  isUpdating?: boolean;
  isSummarizing?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.messageId,
    data: {
      type: 'card',
      status: item.status,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='group rounded-2xl border bg-card p-3 shadow-sm transition-all hover:shadow-md'
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex items-start gap-2'>
          {/* Drag handle */}
          <span
            ref={setActivatorNodeRef}
            className='mt-1 cursor-grab text-muted-foreground/80 hover:text-muted-foreground'
            {...attributes}
            {...listeners}
            title='Drag'
          >
            <GripVertical className='h-4 w-4' />
          </span>

          {/* Avatar */}
          <div className='flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold'>
            {initials(item.senderName)}
          </div>

          <div className='min-w-0'>
            <p className='text-sm font-semibold line-clamp-1'>
              {item.senderName ?? 'Unknown'}
            </p>
            <p className='text-xs text-muted-foreground line-clamp-1'>
              {item.senderEmail}
            </p>
          </div>
        </div>

        {(isUpdating || isSummarizing) && (
          <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
        )}
      </div>

      <p className='mt-2 text-sm font-medium line-clamp-2'>
        {item.subject ?? '(No subject)'}
      </p>

      {/* Timestamp - use receivedAt (email date) or fallback to createdAt (DB insert) */}
      {(item.receivedAt || item.createdAt) && (
        <p className='mt-1 text-xs text-muted-foreground'>
          {formatRelativeTime(item.receivedAt || item.createdAt)}
        </p>
      )}

      {/* Summary */}
      <div className='mt-2'>
        {item.summary ? (
          <div className='rounded-lg bg-muted/40 p-2 overflow-hidden'>
            <div className='mb-1 flex items-center gap-1'>
              <Sparkles className='h-3.5 w-3.5 text-muted-foreground' />
              <p className='text-[10px] font-semibold text-muted-foreground'>
                AI Summary
              </p>
            </div>
            <p className='text-xs leading-relaxed wrap-break-word overflow-wrap-anywhere'>
              {item.summary}
            </p>
          </div>
        ) : (
          <div className='rounded-lg border border-dashed p-2'>
            <p className='text-xs text-muted-foreground'>
              {isSummarizing ? 'Generating summary...' : 'Summary pending...'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className='mt-3 flex items-center gap-1'>
        <SnoozePopover
          disabled={isUpdating}
          onConfirm={(untilIso) => onSnooze(untilIso)}
        />

        <Button
          size='sm'
          variant='ghost'
          className='h-7 px-2 text-xs'
          disabled={isUpdating}
          onClick={() => onOpenMail?.(item.messageId)}
          title='Open mail'
        >
          <MailOpen className='mr-1 h-3.5 w-3.5' />
          Open mail
        </Button>
      </div>
    </div>
  );
}
