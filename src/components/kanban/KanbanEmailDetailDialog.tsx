/**
 * KanbanEmailDetailDialog Component
 *
 * Modal dialog for viewing full email details from kanban board.
 * Features:
 * - Full email content display
 * - Sender information
 * - Attachments list
 * - Timestamp
 * - Loading skeleton
 */

import { useQuery } from '@tanstack/react-query';
import {
  getEmailDetail,
  type EmailDetailResponse,
  type EmailDetail,
} from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MailOpen, Paperclip, X, User, AtSign, Calendar } from 'lucide-react';

/**
 * Attachment row component
 */
function AttachmentRow({
  fileName,
  size,
}: {
  fileName: string;
  size?: string;
}) {
  return (
    <div className='flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2'>
      <div className='flex items-center gap-2 min-w-0'>
        <Paperclip className='h-4 w-4 text-muted-foreground shrink-0' />
        <div className='min-w-0'>
          <p className='text-sm font-medium line-clamp-1'>{fileName}</p>
          {size ? (
            <p className='text-xs text-muted-foreground'>{size}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for email detail dialog
 */
function DetailSkeleton() {
  return (
    <div className='space-y-4 animate-pulse'>
      <div className='rounded-2xl border bg-card p-4'>
        <div className='h-3 w-20 rounded bg-muted' />
        <div className='mt-2 h-6 w-3/4 rounded bg-muted' />
        <div className='mt-4 space-y-2'>
          <div className='h-4 w-2/3 rounded bg-muted' />
          <div className='h-4 w-1/2 rounded bg-muted' />
          <div className='h-3 w-40 rounded bg-muted' />
        </div>
      </div>
      <div className='rounded-2xl border bg-card p-4'>
        <div className='h-3 w-20 rounded bg-muted' />
        <div className='mt-3 h-24 w-full rounded bg-muted' />
      </div>
    </div>
  );
}

export function KanbanEmailDetailDialog({
  emailId,
  open,
  onOpenChange,
}: {
  emailId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useQuery<EmailDetailResponse>({
    queryKey: ['email', emailId ?? 'none'],
    queryFn: () => getEmailDetail(emailId!),
    enabled: open && !!emailId,
  });

  const email: EmailDetail | null = detailQuery.data?.data ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className='
        p-0
        overflow-hidden
        w-[96vw] max-w-4xl
        max-h-[90vh]
        rounded-2xl
      '
      >
        <div className='flex h-full flex-col min-w-0'>
          {/* ===== Header (sticky + gọn) ===== */}
          <div className='sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3 min-w-0'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
                  <MailOpen className='h-4 w-4 text-muted-foreground' />
                </div>

                <div className='min-w-0'>
                  <p className='text-[10px] uppercase tracking-[0.22em] text-muted-foreground'>
                    Mail detail
                  </p>
                  <DialogTitle className='text-sm font-semibold line-clamp-1'>
                    {email?.subject ?? 'Email detail'}
                  </DialogTitle>
                </div>
              </div>

              <DialogClose asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-full'
                  aria-label='Close'
                >
                  <X className='h-4 w-4' />
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* ===== Body scroll (ngang + dọc) ===== */}
          <div className='flex-1 overflow-auto px-4 py-4 min-w-0'>
            {detailQuery.isLoading && <DetailSkeleton />}

            {detailQuery.isError && (
              <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm'>
                Failed to load email detail.
              </div>
            )}

            {email && (
              <div className='space-y-4 min-w-0'>
                {/* SUBJECT CARD */}
                <div className='rounded-2xl border bg-card p-4 shadow-sm'>
                  <p className='text-xs uppercase tracking-[0.25em] text-muted-foreground'>
                    Subject
                  </p>
                  <h3 className='mt-1 text-lg font-semibold leading-snug'>
                    {email.subject}
                  </h3>

                  <div className='mt-3 grid gap-2 text-sm'>
                    <div className='flex items-start gap-2'>
                      <User className='mt-0.5 h-4 w-4 text-muted-foreground' />
                      <div>
                        <span className='text-muted-foreground'>From: </span>
                        <span className='font-medium'>
                          {email.senderName}
                        </span>{' '}
                        <span className='text-muted-foreground'>
                          &lt;{email.senderEmail}&gt;
                        </span>
                      </div>
                    </div>

                    <div className='flex items-start gap-2'>
                      <AtSign className='mt-0.5 h-4 w-4 text-muted-foreground' />
                      <div className='text-muted-foreground'>
                        To:{' '}
                        <span className='text-foreground'>
                          {(email.to ?? []).join(', ')}
                        </span>
                        {email.cc?.length ? (
                          <>
                            {' '}
                            — Cc:{' '}
                            <span className='text-foreground'>
                              {email.cc.join(', ')}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <Calendar className='h-3.5 w-3.5' />
                      Received {new Date(email.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* ATTACHMENTS */}
                {email.attachments?.length ? (
                  <div className='rounded-2xl border bg-card p-4'>
                    <div className='mb-3 flex items-center justify-between'>
                      <p className='text-sm font-semibold'>Attachments</p>
                      <span className='rounded-full bg-muted px-2 py-0.5 text-xs font-semibold'>
                        {email.attachments.length}
                      </span>
                    </div>
                    <div className='grid gap-2'>
                      {email.attachments.map((a) => (
                        <AttachmentRow
                          key={a.id}
                          fileName={a.fileName}
                          size={a.size}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* BODY */}
                <div className='rounded-2xl border bg-card p-4 min-w-0'>
                  <p className='mb-3 text-xs uppercase tracking-[0.25em] text-muted-foreground'>
                    Body
                  </p>

                  {/* Scroll ngang riêng cho HTML quá rộng */}
                  <div className='overflow-x-auto min-w-0'>
                    <div
                      className='
                      prose prose-sm max-w-none dark:prose-invert
                      prose-a:break-all
                      prose-pre:whitespace-pre-wrap
                      prose-pre:break-words
                      prose-code:break-words
                    '
                      dangerouslySetInnerHTML={{ __html: email.body }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
