/**
 * Mailbox/Label utility functions
 */

/**
 * Formats mailbox/label name for display
 * Converts system label IDs to user-friendly names
 * Formats CATEGORY_ labels and user labels nicely
 *
 * @param name - Raw label name from Gmail
 * @returns Formatted display name
 *
 * @example
 * formatMailboxName('INBOX') => 'Inbox'
 * formatMailboxName('SENT') => 'Sent'
 * formatMailboxName('CATEGORY_SOCIAL') => 'Social'
 * formatMailboxName('CATEGORY_PROMOTIONS') => 'Promotions'
 * formatMailboxName('my-custom-label') => 'My Custom Label'
 */
export function formatMailboxName(name: string): string {
  if (!name) return name;

  // System labels mapping (Gmail-style)
  const systemLabels: Record<string, string> = {
    INBOX: 'Inbox',
    SENT: 'Sent',
    DRAFT: 'Drafts',
    TRASH: 'Trash',
    SPAM: 'Spam',
    STARRED: 'Starred',
    IMPORTANT: 'Important',
    UNREAD: 'Unread',
    CHAT: 'Chat',
    SCHEDULED: 'Scheduled',
    SNOOZED: 'Snoozed',
    ALL_MAIL: 'All Mail',
    // Categories
    CATEGORY_SOCIAL: 'Social',
    CATEGORY_PROMOTIONS: 'Promotions',
    CATEGORY_UPDATES: 'Updates',
    CATEGORY_FORUMS: 'Forums',
    CATEGORY_PURCHASES: 'Purchases',
    CATEGORY_PRIMARY: 'Primary',
    CATEGORY_SCHEDULED: 'Scheduled',
  };

  // Check if it's a system label
  const upperName = name.toUpperCase();
  if (systemLabels[upperName]) {
    return systemLabels[upperName];
  }
  // Also check exact match for CATEGORY_ labels
  if (systemLabels[name]) {
    return systemLabels[name];
  }

  // Handle CATEGORY_ labels (Gmail categories) - fallback
  if (name.startsWith('CATEGORY_')) {
    const category = name.substring('CATEGORY_'.length);
    return category
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Handle Label_ prefix (Gmail auto-generated)
  if (name.startsWith('Label_')) {
    const labelNum = name.substring('Label_'.length);
    return `Label ${labelNum}`;
  }

  // User-created labels: capitalize first letter of each word
  // Replace underscores/hyphens with spaces
  return name
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => {
      if (word.length === 0) return word;
      // Keep all-caps acronyms (e.g., "API", "UI")
      if (word.length > 1 && word === word.toUpperCase()) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
