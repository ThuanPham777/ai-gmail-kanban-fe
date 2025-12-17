/**
 * Constants for Traditional Inbox View
 * Centralizes magic numbers and configuration values
 */

/**
 * Number of emails to fetch per page/request
 * Used in infinite scroll pagination
 */
export const EMAILS_PER_PAGE = 10;

/**
 * Distance from bottom (in pixels) to trigger auto-load
 * When user scrolls within this threshold, next page loads automatically
 */
export const SCROLL_LOAD_THRESHOLD = 200;

/**
 * Debounce delay for search input (in milliseconds)
 * Prevents excessive API calls while user is typing
 */
export const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Maximum email subject length to display in list view
 * Longer subjects will be truncated with ellipsis
 */
export const MAX_SUBJECT_LENGTH = 100;

/**
 * Maximum email preview length in list view
 * Longer previews will be truncated
 */
export const MAX_PREVIEW_LENGTH = 150;
