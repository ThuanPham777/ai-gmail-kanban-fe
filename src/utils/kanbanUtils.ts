/**
 * Utility functions for Kanban board operations
 */

import type { KanbanEmailItem } from '@/lib/api';

/**
 * Formats date for snooze display
 * @param isoString - ISO date string
 * @returns Human-readable date string
 */
export function formatSnoozeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Truncates text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Extracts email address from sender field
 * Handles formats: "Name <email@domain.com>" or "email@domain.com"
 * @param sender - Sender string
 * @returns Email address
 */
export function extractEmail(sender: string): string {
  const match = sender.match(/<(.+@.+)>/);
  return match ? match[1] : sender;
}

/**
 * Gets display color for kanban column
 * @param status - Column status
 * @returns Tailwind color class
 */
export function getColumnColor(status: string): string {
  const colorMap: Record<string, string> = {
    INBOX: 'bg-blue-50 border-blue-200',
    IN_PROGRESS: 'bg-yellow-50 border-yellow-200',
    DONE: 'bg-green-50 border-green-200',
  };
  return colorMap[status] || 'bg-gray-50 border-gray-200';
}

/**
 * Determines if item needs AI summary
 * @param item - Kanban email item
 * @returns True if summary is missing or empty
 */
export function needsSummary(item: KanbanEmailItem): boolean {
  return !item.summary || item.summary.trim().length === 0;
}

/**
 * Calculates relative time from date
 * @param dateString - ISO date string or Date object
 * @returns Human-readable relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(dateString: string | Date): string {
  const date =
    typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Validates snooze date is in the future
 * @param dateString - ISO date string
 * @returns True if date is in the future
 */
export function isValidSnoozeDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date.getTime() > now.getTime();
}

/**
 * Generates a unique key for a kanban item
 * Used for React list keys
 * @param item - Kanban email item
 * @returns Unique string key
 */
export function getItemKey(item: KanbanEmailItem): string {
  return `${item.messageId}-${item.status}`;
}
