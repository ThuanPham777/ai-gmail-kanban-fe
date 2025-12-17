import { Button } from '@/components/ui/button';
import type { Mailbox } from '@/lib/api';

/**
 * MailboxSidebar - Left sidebar showing mailboxes/labels with message counts
 *
 * Features:
 * - Lists all mailboxes (INBOX, SENT, DRAFT, etc.) with unread counts
 * - Highlights selected mailbox
 * - Optional compose button
 * - Loading skeleton state
 * - Scrollable list for many mailboxes
 *
 * @param mailboxes - Array of mailbox objects (id, name, messagesTotal, messagesUnread)
 * @param isLoading - Loading state while fetching mailboxes
 * @param selectedId - Currently selected mailbox ID
 * @param onSelect - Handler when mailbox is clicked
 * @param onCompose - Handler for compose button click
 * @param title - Sidebar header title (default: "Mailboxes")
 * @param showCompose - Whether to show compose button (default: true)
 */
export function MailboxSidebar({
  mailboxes,
  isLoading,
  selectedId,
  onSelect,
  onCompose,
  title = 'Mailboxes',
  showCompose = true,
}: {
  mailboxes: Mailbox[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCompose?: () => void;
  title?: string;
  showCompose?: boolean;
}) {
  return (
    <div className='rounded-xl border bg-card shadow-sm flex flex-col h-full min-h-0 overflow-hidden'>
      <div className='flex items-center justify-between border-b px-4 py-3 shrink-0'>
        <p className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          {title}
        </p>
        {showCompose && onCompose && (
          <Button
            size='sm'
            variant='outline'
            className='gap-1'
            onClick={onCompose}
          >
            Compose
          </Button>
        )}
      </div>

      <div className='flex-1 overflow-y-auto min-h-0 scrollbar-thin'>
        {isLoading ? (
          <div className='p-4 text-sm text-muted-foreground'>Loading…</div>
        ) : mailboxes.length ? (
          <ul className='divide-y'>
            {mailboxes.map((mailbox) => (
              <li key={mailbox.id}>
                <button
                  type='button'
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    selectedId === mailbox.id
                      ? 'bg-primary/10 font-semibold'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onSelect(mailbox.id)}
                >
                  <span>{mailbox.name}</span>
                  {typeof mailbox.unread === 'number' && (
                    <span className='rounded-full bg-muted px-2 py-0.5 text-xs font-semibold'>
                      {mailbox.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className='p-4 text-sm text-muted-foreground'>No mailboxes.</div>
        )}
      </div>
    </div>
  );
}
