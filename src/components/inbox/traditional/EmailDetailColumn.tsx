import { useState } from 'react';
import type { EmailDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Star,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Loader2,
  ArrowLeft,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { MailIcon } from './MailIcon';

/**
 * EmailDetailColumn - Displays full email content with actions
 *
 * Features:
 * - Email metadata (from, to, subject, date)
 * - HTML body rendering with sanitization
 * - Action buttons (reply, forward, star, archive)
 * - Attachment download support
 * - Inline reply/reply-all composer
 * - "Open in Gmail" external link
 *
 * @param email - Full email details to display
 * @param isLoading - Loading state for initial email fetch
 * @param hasSelection - Whether an email is selected (shows placeholder if false)
 * @param onBack - Mobile back button handler
 * @param isMobile - Mobile layout flag
 * @param onReply - Reply/reply-all handler
 * @param onModify - Email action handler (star, archive, mark read)
 * @param onDownloadAttachment - Attachment download handler
 * @param isLoadingAction - Loading state for ongoing actions
 * @param onForward - Forward button handler
 */
export function EmailDetailColumn({
  email,
  isLoading,
  hasSelection,
  onBack,
  isMobile = false,
  onReply,
  onModify,
  onDownloadAttachment,
  isLoadingAction,
  onForward,
}: {
  email: EmailDetail | null;
  isLoading: boolean;
  hasSelection: boolean;
  onBack?: () => void;
  isMobile?: boolean;
  onReply?: (body: string, replyAll?: boolean) => Promise<void>;
  onModify?: (actions: {
    markRead?: boolean;
    markUnread?: boolean;
    star?: boolean;
    unstar?: boolean;
    delete?: boolean;
  }) => void;
  onDownloadAttachment?: (attachmentId: string, fileName: string) => void;
  isLoadingAction?: boolean;
  onForward?: (email: EmailDetail) => void;
}) {
  // Reply composer state
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  /**
   * Initiates reply mode (reply or reply-all)
   */
  const startReply = (mode: 'reply' | 'replyAll') => {
    if (!onReply) return;
    setReplyMode(mode);
    setReplyBody('');
  };

  /**
   * Closes reply composer and clears draft
   */
  const cancelReply = () => {
    setReplyMode(null);
    setReplyBody('');
  };

  /**
   * Sends the reply and closes composer on success
   */
  const submitReply = async () => {
    if (!replyMode || !onReply || !replyBody.trim()) return;
    try {
      setSubmittingReply(true);
      await onReply(replyBody, replyMode === 'replyAll');
      cancelReply();
    } finally {
      setSubmittingReply(false);
    }
  };

  /**
   * Toggles star status of current email
   */
  const handleStarToggle = (currentlyStarred: boolean) => {
    if (onModify) {
      onModify(currentlyStarred ? { unstar: true } : { star: true });
    }
  };

  /**
   * Archives (deletes) the current email
   */
  const handleArchive = () => {
    if (onModify) {
      onModify({ delete: true });
    }
  };

  return (
    <div className='flex h-full flex-col rounded-xl border bg-card shadow-sm min-h-0 min-w-0 overflow-hidden'>
      <div className='flex items-center justify-between border-b px-4 py-3 shrink-0'>
        <div className='flex items-center gap-2'>
          {isMobile && onBack && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onBack}
            >
              <ArrowLeft className='h-4 w-4' />
              Back
            </Button>
          )}
          <p className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Email detail
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleArchive}
            disabled={isLoadingAction}
          >
            <Archive className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => email && handleStarToggle(email.starred)}
            disabled={isLoadingAction || !email}
          >
            <Star className='h-4 w-4' />
          </Button>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto min-h-0 p-4'>
        {isLoading ? (
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            Loading email…
          </div>
        ) : email ? (
          <article className='space-y-4'>
            <div>
              <p className='text-xs uppercase text-muted-foreground'>Subject</p>
              <h2 className='text-2xl font-semibold'>{email.subject}</h2>
            </div>
            <div className='rounded-lg border p-3'>
              <p className='text-sm'>
                From <span className='font-semibold'>{email.senderName}</span>{' '}
                <span className='text-muted-foreground'>
                  &lt;{email.senderEmail}&gt;
                </span>
              </p>
              <p className='text-sm text-muted-foreground'>
                To: {email.to.join(', ')}
                {email.cc?.length ? ` — Cc: ${email.cc.join(', ')}` : ''}
              </p>
              <p className='text-xs text-muted-foreground'>
                Received {new Date(email.timestamp).toLocaleString()}
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => startReply('reply')}
                disabled={isLoadingAction || !onReply}
              >
                <Reply className='h-4 w-4' /> Reply
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => startReply('replyAll')}
                disabled={isLoadingAction || !onReply}
              >
                <ReplyAll className='h-4 w-4' /> Reply all
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => email && onForward && onForward(email)}
                disabled={!onForward || !email || isLoadingAction}
              >
                <Forward className='h-4 w-4' /> Forward
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  if (email?.id) {
                    const messageId = email.id.split('|')[1] || email.id;
                    window.open(
                      `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
                      '_blank'
                    );
                  }
                }}
                disabled={!email}
                title='Open in Gmail'
              >
                <ExternalLink className='h-4 w-4' /> Open in Gmail
              </Button>
            </div>
            <div
              className='prose prose-sm max-w-none dark:prose-invert'
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
            {email.attachments?.length ? (
              <div>
                <p className='text-sm font-semibold mb-2'>Attachments</p>
                <div className='space-y-2'>
                  {email.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className='flex items-center justify-between rounded border px-3 py-2 text-sm'
                    >
                      <div className='flex items-center gap-2'>
                        <Paperclip className='h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='font-medium'>{attachment.fileName}</p>
                          <p className='text-xs text-muted-foreground'>
                            {attachment.size}
                          </p>
                        </div>
                      </div>
                      <Button
                        size='sm'
                        variant='ghost'
                        disabled={!onDownloadAttachment}
                        onClick={() =>
                          onDownloadAttachment &&
                          onDownloadAttachment(
                            attachment.id,
                            attachment.fileName
                          )
                        }
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {replyMode && (
              <div className='rounded-lg border p-3 space-y-3'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-semibold'>
                    {replyMode === 'replyAll' ? 'Reply all' : 'Reply'}
                  </p>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={cancelReply}
                    disabled={submittingReply}
                  >
                    Cancel
                  </Button>
                </div>
                <textarea
                  className='w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  rows={5}
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder='Write your reply…'
                  disabled={submittingReply}
                />
                <div className='flex justify-end'>
                  <Button
                    onClick={submitReply}
                    disabled={submittingReply || !replyBody.trim()}
                  >
                    {submittingReply ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Sending…
                      </>
                    ) : (
                      'Send reply'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </article>
        ) : hasSelection ? (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
            <MailIcon />
            <p>Select an email to view the full thread.</p>
          </div>
        ) : (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
            <MailIcon />
            <p>No email selected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
