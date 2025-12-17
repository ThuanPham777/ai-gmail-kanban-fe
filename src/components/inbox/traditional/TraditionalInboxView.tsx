/**
 * TraditionalInboxView Component
 *
 * Displays emails in a 2-column layout (email list + email detail)
 * Features:
 * - Infinite scroll pagination
 * - Email search/filter
 * - Bulk actions (mark read/unread, star, delete)
 * - Email compose/reply
 * - Optimistic UI updates
 */

import { useMemo, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getMailboxEmailsInfinite,
  getEmailDetail,
  getAttachment,
  type EmailDetailResponse,
  type SendEmailData,
} from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmailListColumn } from './EmailListColumn';
import { EmailDetailColumn } from './EmailDetailColumn';
import { ComposeModal } from './ComposeModal';
import { useEmailMutations } from '../../../hooks/email/useEmailMutations';
import { useEmailSelection } from '../../../hooks/email/useEmailSelection';
import {
  downloadAttachment,
  filterEmailsBySearchTerm,
  createDefaultComposeDraft,
} from '../../../utils/emailUtils';
import { EMAILS_PER_PAGE } from '../../../constants/constants.email';

type ComposeDraft = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
};

export function TraditionalInboxView({
  mailboxId,
  emailSearchTerm = '',
}: {
  mailboxId: string;
  emailSearchTerm?: string;
}) {
  // State for compose modal and action messages
  const [composeDraft, setComposeDraft] = useState<ComposeDraft | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  /**
   * Fetch emails with infinite scroll pagination
   * Uses pageToken from Gmail API for cursor-based pagination
   */
  const emailsQuery = useInfiniteQuery({
    queryKey: ['emails-infinite', mailboxId],
    queryFn: ({ pageParam }) =>
      getMailboxEmailsInfinite(mailboxId, pageParam, EMAILS_PER_PAGE),
    enabled: !!mailboxId,
    getNextPageParam: (lastPage) => lastPage.meta.nextPageToken ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  /**
   * Flatten paginated data into single array
   */
  const allEmails = useMemo(() => {
    return emailsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  }, [emailsQuery.data]);

  /**
   * Custom hook for managing email selections
   */
  const {
    selectedEmailId,
    selectedEmails,
    setSelectedEmailId,
    handleToggleSelect,
    handleSelectAll,
    clearSelections,
  } = useEmailSelection({ emails: allEmails, mailboxId });

  /**
   * Fetch detail of currently selected email
   */
  const emailDetailQuery = useQuery<EmailDetailResponse>({
    queryKey: ['email', selectedEmailId ?? 'none'],
    queryFn: () => getEmailDetail(selectedEmailId!),
    enabled: Boolean(selectedEmailId),
  });

  /**
   * Show temporary success/error messages
   */
  const showMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(null), 2000);
  };

  /**
   * Email mutations (send, reply, modify) with optimistic updates
   */
  const { sendMutation, replyMutation, modifyMutation } = useEmailMutations({
    mailboxId,
    onSuccess: (message) => {
      showMessage(message);
      if (message.includes('sent')) {
        setComposeDraft(null);
      }
    },
    onError: showMessage,
  });

  /**
   * Handle bulk modification of multiple selected emails
   */
  const handleBulkModify = async (actions: any, successMessage: string) => {
    if (!selectedEmails.length) {
      return showMessage('Please select at least one email');
    }

    await Promise.all(
      selectedEmails.map((id) =>
        modifyMutation.mutateAsync({ emailId: id, actions })
      )
    );

    clearSelections();
    showMessage(successMessage);
  };

  /**
   * Filter emails based on search term
   */
  const filteredEmails = useMemo(
    () => filterEmailsBySearchTerm(allEmails, emailSearchTerm),
    [allEmails, emailSearchTerm]
  );

  /**
   * Open compose modal with optional initial values
   */
  const openCompose = (initial?: Partial<ComposeDraft>) => {
    setComposeDraft(createDefaultComposeDraft(initial));
  };

  /**
   * Download email attachment
   */
  const handleDownloadAttachment = async (
    attachmentId: string,
    fileName: string
  ) => {
    if (!selectedEmailId) return;

    const blob = await getAttachment(selectedEmailId, attachmentId);
    downloadAttachment(blob, fileName);
  };

  return (
    <div className='flex flex-col h-full'>
      {actionMessage && (
        <Alert className='mb-4'>
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      )}

      <div className='grid gap-4 lg:grid-cols-2 flex-1 min-h-0'>
        <EmailListColumn
          emails={filteredEmails}
          isLoading={emailsQuery.isLoading}
          isFetching={emailsQuery.isFetching || emailsQuery.isFetchingNextPage}
          hasMore={emailsQuery.hasNextPage ?? false}
          onLoadMore={() => emailsQuery.fetchNextPage()}
          selectedEmails={selectedEmails}
          onSelectEmail={setSelectedEmailId}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onMarkRead={() => handleBulkModify({ markRead: true }, 'Marked read')}
          onMarkUnread={() =>
            handleBulkModify({ markUnread: true }, 'Marked unread')
          }
          onDeleteSelected={() =>
            handleBulkModify({ delete: true }, 'Moved to trash')
          }
          onStarToggle={(id, starred) =>
            modifyMutation.mutate({
              emailId: id,
              actions: starred ? { unstar: true } : { star: true },
            })
          }
          actionsDisabled={modifyMutation.isPending}
          activeEmailId={selectedEmailId}
          onCompose={() => openCompose()}
        />

        <EmailDetailColumn
          email={emailDetailQuery.data?.data ?? null}
          isLoading={emailDetailQuery.isLoading}
          hasSelection={!!selectedEmailId}
          onReply={
            selectedEmailId
              ? async (body, replyAll) => {
                  await replyMutation.mutateAsync({
                    emailId: selectedEmailId,
                    body,
                    replyAll,
                  });
                }
              : undefined
          }
          onModify={
            selectedEmailId
              ? (actions) =>
                  modifyMutation.mutate({ emailId: selectedEmailId, actions })
              : undefined
          }
          onDownloadAttachment={
            selectedEmailId ? handleDownloadAttachment : undefined
          }
          isLoadingAction={replyMutation.isPending || modifyMutation.isPending}
        />
      </div>

      {composeDraft && (
        <ComposeModal
          draft={composeDraft}
          onClose={() => setComposeDraft(null)}
          onSend={(payload: SendEmailData) => sendMutation.mutate(payload)}
          isLoading={sendMutation.isPending}
        />
      )}
    </div>
  );
}
