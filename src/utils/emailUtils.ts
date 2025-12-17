/**
 * Utility functions for email operations
 */

/**
 * Downloads an attachment by creating a temporary anchor element
 * @param blob - The file blob to download
 * @param fileName - The name for the downloaded file
 */
export function downloadAttachment(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

/**
 * Filters emails based on search term
 * Searches in sender name, subject, and preview text
 */
export function filterEmailsBySearchTerm(
  emails: any[],
  searchTerm: string
): any[] {
  if (!searchTerm.trim()) return emails;

  const term = searchTerm.toLowerCase();
  return emails.filter(
    (email) =>
      email.senderName?.toLowerCase().includes(term) ||
      email.subject?.toLowerCase().includes(term) ||
      email.preview?.toLowerCase().includes(term)
  );
}

/**
 * Creates a default compose draft object
 */
export function createDefaultComposeDraft(
  initial?: Partial<{
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
  }>
) {
  return {
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    ...initial,
  };
}
