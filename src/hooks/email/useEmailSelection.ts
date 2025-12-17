/**
 * Custom hook for managing email selection state
 * Handles single selection, multi-selection, and auto-selection logic
 */

import { useEffect, useState } from 'react';
import type { EmailListItem } from '@/lib/api';

interface UseEmailSelectionProps {
  emails: EmailListItem[];
  mailboxId: string;
}

export function useEmailSelection({
  emails,
  mailboxId,
}: UseEmailSelectionProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  /**
   * Reset selection when mailbox changes
   */
  useEffect(() => {
    setSelectedEmails([]);
    setSelectedEmailId(null);
  }, [mailboxId]);

  /**
   * Auto-select first email or maintain selection
   * If currently selected email is deleted, select the next one
   */
  useEffect(() => {
    if (!emails.length) {
      setSelectedEmailId(null);
      return;
    }

    const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);

    // Email no longer exists (deleted), select adjacent email
    if (currentIndex === -1) {
      const nextEmail = emails[Math.min(0, emails.length - 1)];
      setSelectedEmailId(nextEmail?.id || emails[0]?.id || null);
    }
  }, [emails, selectedEmailId]);

  /**
   * Toggle selection of a single email (for bulk actions)
   */
  const handleToggleSelect = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };

  /**
   * Select or deselect all emails
   */
  const handleSelectAll = () => {
    if (!emails.length) return;
    setSelectedEmails((prev) =>
      prev.length === emails.length ? [] : emails.map((e) => e.id)
    );
  };

  /**
   * Clear all selections (useful after bulk actions)
   */
  const clearSelections = () => {
    setSelectedEmails([]);
  };

  return {
    selectedEmailId,
    selectedEmails,
    setSelectedEmailId,
    handleToggleSelect,
    handleSelectAll,
    clearSelections,
  };
}
