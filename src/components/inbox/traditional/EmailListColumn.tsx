/**
 * EmailListColumn Component
 *
 * Displays a scrollable list of emails with:
 * - Infinite scroll loading
 * - Multi-select for bulk actions
 * - Individual email actions (star/unstar)
 * - Search highlighting
 */

import { useRef, useCallback } from 'react';
import type { EmailListItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Trash2,
  Star,
  StarOff,
  Loader2,
  Plus,
} from 'lucide-react';
import { MailIcon } from './MailIcon';
import { SCROLL_LOAD_THRESHOLD } from '../../../constants/constants.email';

export function EmailListColumn({
  emails,
  isLoading,
  isFetching,
  hasMore,
  onLoadMore,
  selectedEmails,
  onSelectEmail,
  onToggleSelect,
  onSelectAll,
  onMarkRead,
  onMarkUnread,
  onDeleteSelected,
  onStarToggle,
  actionsDisabled,
  activeEmailId,
  compact,
  onCompose,
}: {
  emails: EmailListItem[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  selectedEmails: string[];
  onSelectEmail: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDeleteSelected: () => void;
  onStarToggle: (emailId: string, starred: boolean) => void;
  actionsDisabled: boolean;
  activeEmailId: string | null;
  compact?: boolean;
  onCompose?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Detect when user scrolls near bottom to trigger auto-load
   * Triggers when within SCROLL_LOAD_THRESHOLD pixels of bottom
   */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !hasMore || isFetching) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom =
      scrollHeight - scrollTop - clientHeight < SCROLL_LOAD_THRESHOLD;

    if (isNearBottom) {
      onLoadMore();
    }
  }, [hasMore, isFetching, onLoadMore]);

  return (
    <div className='flex h-full flex-col rounded-xl border bg-card shadow-sm min-h-0 min-w-0 overflow-hidden'>
      <div className='border-b px-4 py-3 shrink-0'>
        <div className='flex items-center gap-2'>
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
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className='flex-1 overflow-y-auto min-h-0'
      >
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

            {/* Loading more indicator */}
            {isFetching && (
              <li className='flex items-center justify-center py-4 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                Loading more emails...
              </li>
            )}

            {/* Load more button (backup nếu auto-scroll không trigger) */}
            {!isFetching && hasMore && (
              <li className='flex items-center justify-center py-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={onLoadMore}
                >
                  Load More
                </Button>
              </li>
            )}
          </ul>
        ) : (
          <div className='flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
            <MailIcon />
            <p>No emails in this mailbox yet.</p>
          </div>
        )}
      </div>

      <div className='flex items-center justify-center border-t px-4 py-2 text-xs text-muted-foreground shrink-0'>
        {emails.length > 0 && (
          <p>
            Showing {emails.length} email{emails.length !== 1 ? 's' : ''}
            {hasMore && ' • Scroll for more'}
          </p>
        )}
      </div>
    </div>
  );
}
