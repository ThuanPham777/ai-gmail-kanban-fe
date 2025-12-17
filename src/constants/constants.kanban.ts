// src/pages/inbox/components/kanban/constants.ts

export const EMAIL_STATUS = {
  INBOX: 'INBOX',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  SNOOZED: 'SNOOZED',
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export const DEFAULT_KANBAN_STATUSES: EmailStatus[] = [
  EMAIL_STATUS.INBOX,
  EMAIL_STATUS.TODO,
  EMAIL_STATUS.IN_PROGRESS,
  EMAIL_STATUS.DONE,
];

export const COLUMN_TITLES: Record<EmailStatus, string> = {
  INBOX: 'INBOX',
  TODO: 'TO DO',
  IN_PROGRESS: 'IN PROGRESS',
  DONE: 'DONE',
  SNOOZED: 'SNOOZED',
};

/**
 * Constants for Kanban Inbox View
 * Centralizes configuration values and magic numbers
 */

/**
 * Maximum number of items to auto-summarize on board load
 * Prevents overwhelming the AI service with too many requests
 */
export const MAX_AUTO_SUMMARIZE_ITEMS = 12;

/**
 * Duration (in milliseconds) to show success/error messages
 */
export const MESSAGE_DISPLAY_DURATION = 2000;

/**
 * Default animation duration for card transitions (in milliseconds)
 */
export const CARD_ANIMATION_DURATION = 200;

/**
 * Maximum length for email subject in card preview
 */
export const MAX_SUBJECT_LENGTH_KANBAN = 60;

/**
 * Maximum length for email preview text in card
 */
export const MAX_PREVIEW_LENGTH_KANBAN = 100;

/**
 * Debounce delay for sender filter input (in milliseconds)
 */
export const FILTER_DEBOUNCE_DELAY = 300;

/**
 * Number of kanban items to fetch per page/request
 * Used in infinite scroll pagination
 */
export const KANBAN_PER_PAGE = 10;
