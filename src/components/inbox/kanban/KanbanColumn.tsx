/**
 * KanbanColumn Component
 *
 * A droppable column in the kanban board.
 * Features:
 * - Drop zone for cards
 * - Visual feedback when hovering with card
 * - Sortable card list
 * - Item count badge
 */

import type { KanbanEmailItem } from '@/lib/api';
import { KanbanCard } from './KanbanCard';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { EmailStatus } from '../../../constants/constants.kanban';

/**
 * Kanban column component
 * @param title - Column title (e.g., "To Do", "In Progress")
 * @param status - Column status identifier
 * @param items - Email items in this column
 * @param onSnoozeItem - Callback for snoozing items
 * @param onOpenMail - Callback for opening email details
 * @param loadingMap - Map of loading states by messageId
 * @param summarizingMap - Map of summarizing states by messageId
 */
export function KanbanColumn({
  title,
  status,
  items,
  onSnoozeItem,
  onOpenMail,
  loadingMap,
  summarizingMap,
}: {
  title: string;
  status: EmailStatus;
  items: KanbanEmailItem[];
  onSnoozeItem: (messageId: string, untilIso: string) => void;
  onOpenMail?: (emailId: string) => void;
  loadingMap: Record<string, boolean>;
  summarizingMap: Record<string, boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status },
  });

  const itemIds = items.map((i) => i.messageId);

  return (
    <div
      ref={setNodeRef}
      className={[
        'h-full rounded-2xl border bg-card/60 p-4 transition-all',
        isOver ? 'ring-1 ring-primary/40 bg-primary/5' : 'hover:bg-card',
      ].join(' ')}
    >
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold'>{title}</h3>
          <span className='rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold'>
            {items.length}
          </span>
        </div>
      </div>

      <SortableContext
        items={itemIds}
        strategy={verticalListSortingStrategy}
      >
        <div className='space-y-3'>
          {items.map((item) => (
            <KanbanCard
              key={item.messageId}
              item={item}
              onSnooze={(until) => onSnoozeItem(item.messageId, until)}
              onOpenMail={onOpenMail}
              isUpdating={!!loadingMap[item.messageId]}
              isSummarizing={!!summarizingMap[item.messageId]}
            />
          ))}
        </div>
      </SortableContext>

      {items.length === 0 && (
        <div className='mt-3 flex h-24 items-center justify-center rounded-xl border border-dashed'>
          <p className='text-xs text-muted-foreground'>Drop emails here</p>
        </div>
      )}
    </div>
  );
}
