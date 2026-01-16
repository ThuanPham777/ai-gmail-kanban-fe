/**
 * KanbanCardPreview Component
 *
 * Preview overlay shown when dragging a kanban card.
 * Displays card content without interactivity during drag operation.
 */

import type { KanbanEmailItem } from '@/lib/api';

/**
 * Generates initials from sender name
 */
function initials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase() || 'U';
}

/**
 * Card preview shown during drag operation
 * @param item - Kanban email item being dragged
 */
export function KanbanCardPreview({ item }: { item: KanbanEmailItem }) {
  return (
    <div className='rounded-2xl border bg-card p-3 shadow-lg'>
      <div className='flex items-start gap-3'>
        <div className='flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold'>
          {initials(item.senderName)}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold line-clamp-1'>
            {item.senderName ?? 'Unknown'}
          </p>
          <p className='text-xs text-muted-foreground line-clamp-1'>
            {item.senderEmail}
          </p>
          <p className='mt-2 text-sm font-medium line-clamp-2'>
            {item.subject ?? '(No subject)'}
          </p>

          <div className='mt-2'>
            {item.summary ? (
              <div className='rounded-md bg-muted/40 p-2 overflow-hidden'>
                <p className='text-[10px] font-semibold text-muted-foreground'>
                  AI Summary
                </p>
                <p className='text-xs leading-relaxed wrap-break-word overflow-wrap-anywhere'>
                  {item.summary}
                </p>
              </div>
            ) : (
              <div className='rounded-md border border-dashed p-2'>
                <p className='text-xs text-muted-foreground'>
                  Summary pending…
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
