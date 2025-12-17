import type { EmailListItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  RefreshCcw,
  CheckSquare,
  Trash2,
  Star,
  StarOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { MailIcon } from './MailIcon';

export function EmailListColumn({
  emails,
  isLoading,
  isFetching,
  page,
  totalPages,
  totalEmails,
  onPageChange,
  selectedEmails,
  onSelectEmail,
  onToggleSelect,
  onSelectAll,
  onRefresh,
  onMarkRead,
  onMarkUnread,
  onDeleteSelected,
  onStarToggle,
  actionsDisabled,
  activeEmailId,
  compact,
  onCompose, // ✅ add
}: {
  emails: EmailListItem[];
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  totalEmails: number;
  onPageChange: (page: number) => void;
  selectedEmails: string[];
  onSelectEmail: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDeleteSelected: () => void;
  onStarToggle: (emailId: string, starred: boolean) => void;
  actionsDisabled: boolean;
  activeEmailId: string | null;
  compact?: boolean;

  onCompose?: () => void; // ✅ add
}) {
  return (
    <div className='flex h-full flex-col rounded-xl border bg-card shadow-sm min-h-0 min-w-0 overflow-hidden'>
      <div className='border-b px-4 py-3 shrink-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='gap-2'
            onClick={onRefresh}
          >
            <RefreshCcw className='h-4 w-4' />
            Refresh
          </Button>

          {onCompose && (
            <Button
              variant='outline'
              size='sm'
              className='gap-2'
              onClick={onCompose}
            >
              <Plus className='h-4 w-4' />
              Compose
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            className='gap-2'
            onClick={onSelectAll}
          >
            <CheckSquare className='h-4 w-4' />
            Select All
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={onMarkRead}
            disabled={actionsDisabled || !selectedEmails.length}
          >
            Mark Read
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={onMarkUnread}
            disabled={actionsDisabled || !selectedEmails.length}
          >
            Mark Unread
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={onDeleteSelected}
            disabled={actionsDisabled || !selectedEmails.length}
          >
            <Trash2 className='h-4 w-4' />
            Delete
          </Button>

          {isFetching && (
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          )}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto min-h-0'>
        {isLoading ? (
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            Loading emails…
          </div>
        ) : emails.length ? (
          <ul>
            {emails.map((email) => (
              <li
                key={email.id}
                tabIndex={0}
                className={`border-b px-4 py-3 outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring ${
                  email.id === activeEmailId ? 'bg-primary/5' : ''
                }`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectEmail(email.id);
                  }
                }}
              >
                <div className='flex items-start gap-3'>
                  <input
                    type='checkbox'
                    className='mt-1 accent-primary'
                    checked={selectedEmails.includes(email.id)}
                    onChange={() => onToggleSelect(email.id)}
                    aria-label={`Select email from ${email.senderName}`}
                  />
                  <div
                    className={`flex-1 cursor-pointer rounded-lg px-2 py-1 ${
                      email.id === activeEmailId ? 'bg-primary/10' : ''
                    } ${compact ? 'text-sm' : ''}`}
                    onClick={() => onSelectEmail(email.id)}
                  >
                    <div className='flex items-center justify-between'>
                      <p className='font-semibold'>
                        {email.senderName}{' '}
                        {email.unread && (
                          <span className='text-xs'>• Unread</span>
                        )}
                      </p>
                      <span className='text-xs text-muted-foreground'>
                        {new Date(email.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className='text-sm font-medium line-clamp-1'>
                      {email.subject}
                    </p>
                    <p className='text-sm text-muted-foreground line-clamp-1'>
                      {email.preview}
                    </p>
                  </div>
                  <button
                    type='button'
                    className='text-muted-foreground hover:text-yellow-500 disabled:opacity-50'
                    onClick={() => onStarToggle(email.id, email.starred)}
                    disabled={actionsDisabled}
                  >
                    {email.starred ? (
                      <Star className='h-4 w-4 fill-current' />
                    ) : (
                      <StarOff className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
            <MailIcon />
            <p>No emails in this mailbox yet.</p>
          </div>
        )}
      </div>

      <div className='flex items-center justify-between border-t px-4 py-3 text-sm shrink-0'>
        <p className='text-muted-foreground'>
          {totalEmails
            ? `Showing ${emails.length} of ${totalEmails} emails · Page ${page} / ${totalPages}`
            : `Showing ${emails.length} emails · Page ${page} / ${totalPages}`}
        </p>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
