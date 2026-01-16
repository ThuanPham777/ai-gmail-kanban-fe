/**
 * KanbanBoard Component
 *
 * Provides drag-and-drop kanban board functionality using @dnd-kit.
 * Features:
 * - Drag cards between columns
 * - Keyboard navigation support
 * - Visual feedback during drag
 * - Touch-friendly with distance threshold
 */

import {
  DndContext,
  closestCorners,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import type { KanbanBoardData, KanbanEmailItem } from '@/lib/api';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardPreview } from './KanbanCardPreview';
import {
  DEFAULT_KANBAN_STATUSES,
  type EmailStatus,
} from '../../constants/constants.kanban';
import type { KanbanColumn as KanbanColumnConfig } from '@/types/kanban-config.types';

/**
 * Finds a kanban item by messageId across all columns
 * @param board - Complete board data
 * @param messageId - Gmail message ID
 * @param statuses - Array of status columns to search
 * @returns Found item or null
 */
function findItem(
  board: KanbanBoardData,
  messageId: string,
  statuses: EmailStatus[]
) {
  for (const st of statuses) {
    const found = (board as any)[st]?.find(
      (i: KanbanEmailItem) => i.messageId === messageId
    );
    if (found) return found;
  }
  return null;
}

/**
 * Main kanban board component with drag-and-drop
 * @param board - Board data with items organized by status
 * @param onMoveItem - Callback when card is moved to new column
 * @param onSnoozeItem - Callback when card is snoozed
 * @param onOpenMail - Callback when card is clicked to view details
 * @param loadingMap - Map of messageId to loading state
 * @param summarizingMap - Map of messageId to summarizing state
 * @param statuses - Array of column statuses (defaults to standard set)
 * @param columnConfig - Dynamic column configuration
 */
export function KanbanBoard({
  board,
  onMoveItem,
  onSnoozeItem,
  onOpenMail,
  loadingMap,
  summarizingMap,
  statuses = DEFAULT_KANBAN_STATUSES,
  columnConfig,
}: {
  board: KanbanBoardData;
  onMoveItem: (messageId: string, status: EmailStatus) => void;
  onSnoozeItem: (messageId: string, untilIso: string) => void;
  onOpenMail?: (emailId: string) => void;
  loadingMap: Record<string, boolean>;
  summarizingMap: Record<string, boolean>;
  statuses?: EmailStatus[];
  columnConfig?: KanbanColumnConfig[];
}) {
  // ID of currently dragged card
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure drag sensors (pointer with distance threshold, keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * Transform board data into column structure for rendering
   * Each column gets title, status, items array, and gmailLabel
   */
  const columns = useMemo(
    () =>
      statuses.map((st) => {
        const config = columnConfig?.find((c) => c.id === st);
        return {
          status: st,
          title: config?.name || st,
          items: (board as any)[st] ?? [],
          gmailLabel: config?.gmailLabel,
        };
      }),
    [board, statuses, columnConfig]
  );

  /**
   * Handles end of drag operation
   * Determines target column and triggers move callback
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);

    const activeData = active.data.current as any;
    const overData = over.data.current as any;

    const fromStatus = activeData?.status as EmailStatus | undefined;
    const toStatus =
      overData?.type === 'column'
        ? (overData.status as EmailStatus)
        : (overData?.status as EmailStatus | undefined);

    if (!fromStatus || !toStatus) return;
    if (fromStatus === toStatus) return;

    onMoveItem(activeIdStr, toStatus);
  };

  const activeItem = activeId ? findItem(board, activeId, statuses) : null;

  const gridClass =
    statuses.length <= 3
      ? 'grid gap-4 lg:grid-cols-3'
      : 'grid gap-4 lg:grid-cols-4';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const pointer = pointerWithin(args);
        return pointer.length ? pointer : closestCorners(args);
      }}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className={gridClass}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            items={col.items}
            gmailLabel={col.gmailLabel}
            onSnoozeItem={onSnoozeItem}
            onOpenMail={onOpenMail}
            loadingMap={loadingMap}
            summarizingMap={summarizingMap}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className='w-[300px]'>
            <KanbanCardPreview item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
