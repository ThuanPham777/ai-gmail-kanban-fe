/**
 * Gmail System Labels
 * These labels always exist in Gmail and don't need validation
 * Matches real Gmail sidebar order
 */
export const GMAIL_SYSTEM_LABELS = [
  'INBOX', // Shows Primary emails only
  'STARRED',
  'SNOOZED',
  'SENT',
  'DRAFT',
  'IMPORTANT',
  'SCHEDULED',
  'ALL_MAIL',
  'SPAM',
  'TRASH',
  // Categories as separate labels
  'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
] as const;

export type GmailSystemLabel = (typeof GMAIL_SYSTEM_LABELS)[number];

/**
 * Check if a label is a Gmail system label
 */
export function isSystemLabel(label: string): boolean {
  return GMAIL_SYSTEM_LABELS.includes(label.toUpperCase() as GmailSystemLabel);
}
