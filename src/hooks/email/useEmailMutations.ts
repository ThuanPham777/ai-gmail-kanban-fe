/**
 * Custom hook for managing email mutations (send, reply, modify)
 * Handles optimistic updates and cache invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gmailCached } from '@/lib/api';
import type { ModifyEmailData, SendEmailData } from '@/lib/api';

interface UseEmailMutationsProps {
  mailboxId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useEmailMutations({
  mailboxId,
  onSuccess,
  onError,
}: UseEmailMutationsProps) {
  const qc = useQueryClient();

  /**
   * Mutation for sending new emails
   * Invalidates email list and cache after successful send
   */
  const sendMutation = useMutation({
    mutationFn: gmailCached.sendEmail,
    onSuccess: () => {
      onSuccess?.('Email sent successfully');
      qc.invalidateQueries({ queryKey: ['emails-infinite', mailboxId] });
    },
    onError: (err: any) => {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to send email';
      onError?.(errorMsg);
    },
  });

  /**
   * Mutation for forwarding emails
   * Invalidates email list and cache after successful forward
   */
  const forwardMutation = useMutation({
    mutationFn: ({
      emailId,
      payload,
    }: {
      emailId: string;
      payload: SendEmailData;
    }) => gmailCached.forwardEmail(emailId, payload),
    onSuccess: () => {
      onSuccess?.('Email forwarded successfully');
      qc.invalidateQueries({ queryKey: ['emails-infinite', mailboxId] });
    },
    onError: (err: any) => {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to forward email';
      onError?.(errorMsg);
    },
  });

  /**
   * Mutation for replying to emails
   * Invalidates both email list and specific email detail + cache
   */
  const replyMutation = useMutation({
    mutationFn: ({
      emailId,
      body,
      replyAll,
      attachments,
    }: {
      emailId: string;
      body: string;
      replyAll?: boolean;
      attachments?: File[];
    }) => gmailCached.replyEmail(emailId, { body, replyAll, attachments }),
    onSuccess: (_data, vars) => {
      onSuccess?.('Reply sent successfully');
      qc.invalidateQueries({ queryKey: ['emails-infinite', mailboxId] });
      qc.invalidateQueries({ queryKey: ['email', vars.emailId] });
    },
    onError: (err: any) => {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to send reply';
      onError?.(errorMsg);
    },
  });

  /**
   * Mutation for modifying emails (read/unread, star/unstar, delete)
   * Uses optimistic updates for immediate UI feedback
   * Rolls back on error, refetches on success to ensure consistency
   * Cache is automatically invalidated by gmailCached.modifyEmail
   */
  const modifyMutation = useMutation({
    mutationFn: ({
      emailId,
      actions,
    }: {
      emailId: string;
      actions: ModifyEmailData;
    }) => gmailCached.modifyEmail(emailId, actions),

    // Optimistic update: Update UI immediately before API responds
    onMutate: async ({ emailId, actions }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await qc.cancelQueries({ queryKey: ['emails-infinite', mailboxId] });
      await qc.cancelQueries({ queryKey: ['email', emailId] });
      await qc.cancelQueries({ queryKey: ['mailboxes'] });

      // Snapshot current data for potential rollback
      const previousEmails = qc.getQueryData(['emails-infinite', mailboxId]);
      const previousEmail = qc.getQueryData(['email', emailId]);
      const previousMailboxes = qc.getQueryData(['mailboxes']);

      // Find the current email's unread status BEFORE updating
      let currentEmailIsUnread = false;
      if (previousEmails && typeof previousEmails === 'object' && 'pages' in previousEmails) {
        const emailData = previousEmails as any;
        if (emailData?.pages) {
          for (const page of emailData.pages) {
            const email = page.data.data.find((e: any) => e.id === emailId);
            if (email) {
              currentEmailIsUnread = email.unread ?? false;
              break;
            }
          }
        }
      }

      // Update email list cache optimistically
      qc.setQueryData(['emails-infinite', mailboxId], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              data: page.data.data
                .map((email: any) => {
                  if (email.id !== emailId) return email;

                  // Apply state changes based on actions
                  return {
                    ...email,
                    unread: actions.markRead
                      ? false
                      : actions.markUnread
                        ? true
                        : email.unread,
                    starred: actions.star
                      ? true
                      : actions.unstar
                        ? false
                        : email.starred,
                  };
                })
                .filter((email: any) => {
                  // Remove from list if it's a delete action
                  return !(actions.delete && email.id === emailId);
                }),
            },
          })),
        };
      });

      // Update email detail cache optimistically
      qc.setQueryData(['email', emailId], (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: {
            ...old.data,
            unread: actions.markRead
              ? false
              : actions.markUnread
                ? true
                : old.data.unread,
            starred: actions.star
              ? true
              : actions.unstar
                ? false
                : old.data.starred,
          },
        };
      });

      // Update mailboxes cache optimistically (for unread count in header/sidebar)
      // IMPORTANT: Only update count if email's unread status is actually changing
      qc.setQueryData(['mailboxes'], (old: any) => {
        if (!old?.data?.mailboxes) return old;

        // Determine if we're changing the unread status
        const isChangingToRead = actions.markRead;
        const isChangingToUnread = actions.markUnread;

        if (!isChangingToRead && !isChangingToUnread) return old;

        return {
          ...old,
          data: {
            ...old.data,
            mailboxes: old.data.mailboxes.map((mailbox: any) => {
              if (mailbox.id !== mailboxId) return mailbox;

              const currentUnread = mailbox.unread ?? 0;
              let newUnread = currentUnread;

              // Only adjust count if the email's status is actually changing
              if (isChangingToRead && currentEmailIsUnread) {
                // Email is unread and we're marking it as read -> decrease count
                newUnread = Math.max(0, currentUnread - 1);
              } else if (isChangingToUnread && !currentEmailIsUnread) {
                // Email is read and we're marking it as unread -> increase count
                newUnread = currentUnread + 1;
              }

              return {
                ...mailbox,
                unread: newUnread,
              };
            }),
          },
        };
      });

      return { previousEmails, previousEmail, previousMailboxes };
    },

    // Rollback optimistic updates if API call fails
    onError: (_err, variables, context: any) => {
      if (context?.previousEmails) {
        qc.setQueryData(['emails-infinite', mailboxId], context.previousEmails);
      }
      if (context?.previousEmail) {
        qc.setQueryData(['email', variables.emailId], context.previousEmail);
      }
      if (context?.previousMailboxes) {
        qc.setQueryData(['mailboxes'], context.previousMailboxes);
      }
      onError?.('Failed to modify email');
    },

    // Refetch data after mutation settles to ensure consistency with server
    onSettled: (_data, _error, { emailId }) => {
      qc.invalidateQueries({ queryKey: ['emails-infinite', mailboxId] });
      qc.invalidateQueries({ queryKey: ['email', emailId] });
      // Invalidate mailboxes to update unread count in sidebar/header
      qc.invalidateQueries({ queryKey: ['mailboxes'] });
    },
  });

  return {
    sendMutation,
    forwardMutation,
    replyMutation,
    modifyMutation,
  };
}
