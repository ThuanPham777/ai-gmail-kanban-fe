import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gmailCached, startGmailWatch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { MailboxSidebar } from '../components/inbox/MailboxSidebar';
import { MobileMenuDrawer } from '../components/inbox/MobileMenuDrawer';
import { InboxView } from '../components/inbox/InboxView';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { KeyboardShortcutsHelp } from '@/components/inbox/KeyboardShortcutsHelp';
import {
  useGmailPush,
  type GmailNotification,
} from '@/hooks/email/useGmailPush';
import {
  invalidateAllEmailListsForMailbox,
  invalidateMailboxes,
} from '@/lib/db/emailCache';
import { InboxHeader } from '@/components/inbox/InboxHeader';

/**
 * InboxPage - Traditional 3-column inbox view
 *
 * Features:
 * - 3-column layout (mailboxes, email list, email detail)
 * - Mailbox sidebar with message counts
 * - Header with search
 * - User profile dropdown with logout
 * - Auto-select first mailbox on load
 * - Real-time updates via Gmail Push (WebSocket)
 * - Offline caching with IndexedDB
 */
export default function InboxPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Mailbox selection
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Email filtering
  const [emailSearchTerm, setEmailSearchTerm] = useState('');

  /**
   * Handle Gmail push notification - invalidate caches and trigger refresh
   * IMPORTANT: Must invalidate IndexedDB cache BEFORE React Query
   * to ensure fresh data is fetched from server
   */
  const handleGmailNotification = useCallback(
    async (notification: GmailNotification) => {
      console.log('🔔 Gmail notification received:', notification);

      // ALWAYS invalidate cache when receiving any Gmail notification
      // Gmail Push can notify about various changes, and we want to stay in sync

      // STEP 1: Invalidate IndexedDB cache FIRST
      // This ensures the cached API will fetch fresh data from server
      await Promise.all([
        invalidateAllEmailListsForMailbox(),
        invalidateMailboxes(),
      ]);
      console.log('✅ IndexedDB cache invalidated for real-time update');

      // STEP 2: Now invalidate React Query to trigger refetch
      // Since IndexedDB is now empty, it will fetch from server
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-emails'] });

      console.log('✅ React Query invalidated, UI will refresh');
    },
    [queryClient]
  );

  // Gmail Push Notifications via WebSocket
  useGmailPush({
    onNotification: handleGmailNotification,
    onConnect: () => {
      console.log('Gmail Push connected');
    },
    onError: (error) => {
      console.error('Gmail Push error:', error);
    },
  });

  // Start Gmail watch on initial load (only once per session)
  useEffect(() => {
    const watchStarted = sessionStorage.getItem('gmailWatchStarted');
    if (!watchStarted && user) {
      startGmailWatch()
        .then(() => {
          sessionStorage.setItem('gmailWatchStarted', 'true');
          console.log('Gmail watch started successfully');
        })
        .catch((err) => {
          console.error('Failed to start Gmail watch:', err);
        });
    }
  }, [user]);

  // Keyboard shortcuts state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch mailboxes (labels) from Gmail API with offline caching
  const mailboxesQuery = useQuery({
    queryKey: ['mailboxes'],
    queryFn: gmailCached.getMailboxes,
  });

  /**
   * Auto-select first mailbox on load
   * Ensures there's always a selected mailbox
   */
  useEffect(() => {
    if (!selectedMailbox && mailboxesQuery.data?.data.mailboxes.length) {
      setSelectedMailbox(mailboxesQuery.data.data.mailboxes[0].id);
    }
  }, [mailboxesQuery.data, selectedMailbox]);

  /**
   * Global keyboard shortcuts
   */
  useKeyboardNavigation({
    handlers: {
      FOCUS_SEARCH: () => {
        searchInputRef.current?.focus();
      },
      SHOW_HELP: () => {
        setShowKeyboardHelp(true);
      },
      CLOSE_MODAL: () => {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        }
      },
    },
  });

  return (
    <div className='h-screen flex flex-col bg-background text-foreground overflow-hidden min-h-screen-mobile'>
      <InboxHeader
        searchInputRef={searchInputRef}
        emailSearchTerm={emailSearchTerm}
        onEmailSearchTermChange={setEmailSearchTerm}
        onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
        onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        userEmail={user?.email}
        userProvider={user?.provider}
        onLogout={logout}
      />

      <main className='flex-1 overflow-hidden min-h-0'>
        <div className='h-full p-2 sm:p-4 flex flex-col min-h-0'>
          <div className='grid gap-2 sm:gap-4 lg:grid-cols-[18%_82%] h-full min-h-0'>
            {/* Desktop sidebar - hidden on mobile/tablet */}
            <div className='hidden lg:block h-full min-h-0'>
              <MailboxSidebar
                mailboxes={mailboxesQuery.data?.data.mailboxes ?? []}
                isLoading={mailboxesQuery.isLoading}
                selectedId={selectedMailbox}
                onSelect={setSelectedMailbox}
                title='Mailboxes'
                showCompose={false}
              />
            </div>

            {/* Email view - full width on mobile, constrained on desktop */}
            <div className='rounded-xl border bg-card p-2 sm:p-4 overflow-hidden h-full min-h-0'>
              {!selectedMailbox ? (
                <div className='text-sm text-muted-foreground p-4'>
                  Select a mailbox…
                </div>
              ) : (
                <InboxView
                  mailboxId={selectedMailbox}
                  emailSearchTerm={emailSearchTerm}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile drawer for mailbox navigation */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        mailboxes={mailboxesQuery.data?.data.mailboxes ?? []}
        selectedId={selectedMailbox}
        onSelect={setSelectedMailbox}
      />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onOpenChange={setShowKeyboardHelp}
      />
    </div>
  );
}
