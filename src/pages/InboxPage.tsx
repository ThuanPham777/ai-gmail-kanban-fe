import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gmailCached } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { searchKanban, semanticSearchKanban } from '@/lib/api/kanban.api';
import { getKanbanColumns } from '@/lib/api/kanban-config.api';
import { SearchResults } from '../components/inbox/SearchResults';
import { MailboxSidebar } from '../components/inbox/MailboxSidebar';
import { MobileMenuDrawer } from '../components/inbox/MobileMenuDrawer';
import { type InboxMode } from '../components/inbox/mode-toggle';
import { TraditionalInboxView } from '../components/inbox/traditional/TraditionalInboxView';
import { KanbanInboxView } from '../components/inbox/kanban/KanbanInboxView';
import { InboxHeader } from '../components/inbox/kanban/InboxHeader';
import { getGmailUrl } from '@/utils/emailUtils';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { KeyboardShortcutsHelp } from '@/components/inbox/KeyboardShortcutsHelp';
import {
  useGmailPush,
  startGmailWatch,
  type GmailNotification,
} from '@/hooks/email/useGmailPush';
import {
  invalidateAllEmailListsForMailbox,
  invalidateMailboxes,
} from '@/lib/db/emailCache';

/**
 * InboxPage - Main inbox container with dual view modes
 *
 * Features:
 * - Toggle between Traditional (Outlook-style) and Kanban views
 * - Mailbox sidebar with message counts
 * - Header with search (traditional) or smart search (kanban)
 * - User profile dropdown with logout
 * - Auto-select first mailbox on load
 * - Fuzzy and semantic search for kanban mode
 * - Real-time updates via Gmail Push (WebSocket)
 * - Offline caching with IndexedDB
 *
 * Architecture:
 * - Traditional mode: 3-column layout (mailboxes, email list, email detail)
 * - Kanban mode: Board with drag-drop columns (To Do, In Progress, Done)
 */
export default function InboxPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // View mode and mailbox selection (persisted in localStorage)
  const [mode, setMode] = useState<InboxMode>(() => {
    const saved = localStorage.getItem('inboxViewMode');
    return (saved as InboxMode) || 'traditional';
  });
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search state (for kanban mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'fuzzy' | 'semantic'>('fuzzy');

  // Email filtering (for traditional mode)
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

  /**
   * Executes kanban search (fuzzy or semantic)
   * @param query - Search query string
   * @param isSemanticSearch - If true, uses AI semantic search; otherwise fuzzy search
   */
  const doSearch = async (query?: string, isSemanticSearch = false) => {
    const q = query || searchQuery;
    if (!q || !q.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    const type = isSemanticSearch ? 'semantic' : 'fuzzy';
    setSearchType(type);

    try {
      const resp = isSemanticSearch
        ? await semanticSearchKanban(q.trim())
        : await searchKanban(q.trim());
      setSearchResults(resp.data?.results ?? []);
    } catch (err: any) {
      setSearchError(err?.message ?? 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch mailboxes (labels) from Gmail API with offline caching
  const mailboxesQuery = useQuery({
    queryKey: ['mailboxes'],
    queryFn: gmailCached.getMailboxes,
  });

  const kanbanColumnsQuery = useQuery({
    queryKey: ['kanban-columns'],
    queryFn: getKanbanColumns,
    enabled: mode === 'kanban',
    staleTime: 60_000,
  });

  /**
   * Auto-select first mailbox when entering traditional mode
   * Ensures there's always a selected mailbox in traditional view
   */
  useEffect(() => {
    if (mode === 'traditional') {
      if (!selectedMailbox && mailboxesQuery.data?.data.mailboxes.length) {
        setSelectedMailbox(mailboxesQuery.data.data.mailboxes[0].id);
      }
    }
  }, [mailboxesQuery.data, selectedMailbox, mode]);

  /**
   * Force INBOX selection when switching to kanban mode
   * Kanban only works with INBOX emails
   * Also persist view mode to localStorage
   */
  useEffect(() => {
    if (mode === 'kanban') {
      setSelectedMailbox('INBOX');
    }
    localStorage.setItem('inboxViewMode', mode);
  }, [mode]);

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
        } else if (searchResults !== null) {
          setSearchResults(null);
          setSearchError(null);
          setSearchQuery('');
        }
      },
    },
  });

  return (
    <div className='h-screen flex flex-col bg-background text-foreground overflow-hidden min-h-screen-mobile'>
      <InboxHeader
        mode={mode}
        onModeChange={setMode}
        searchInputRef={searchInputRef}
        emailSearchTerm={emailSearchTerm}
        onEmailSearchTermChange={setEmailSearchTerm}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={doSearch}
        onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
        onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        userEmail={user?.email}
        userProvider={user?.provider}
        onLogout={logout}
      />

      <main className='flex-1 overflow-hidden min-h-0'>
        <div className='h-full p-2 sm:p-4 flex flex-col min-h-0'>
          {searchResults !== null || searchLoading ? (
            <div className='rounded-xl border bg-card p-2 sm:p-4 overflow-auto smooth-scroll'>
              <SearchResults
                items={searchResults || []}
                loading={searchLoading}
                error={searchError}
                searchType={searchType}
                columns={kanbanColumnsQuery.data}
                onView={(id) => {
                  const gmailUrl = getGmailUrl(id, user?.email);
                  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
                }}
                onClear={() => {
                  setSearchResults(null);
                  setSearchError(null);
                  setSearchQuery('');
                }}
              />
            </div>
          ) : mode === 'traditional' ? (
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
                  <TraditionalInboxView
                    mailboxId={selectedMailbox}
                    emailSearchTerm={emailSearchTerm}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className='rounded-xl border bg-card p-2 sm:p-4 overflow-auto smooth-scroll touch-scroll'>
              <KanbanInboxView labelId={selectedMailbox ?? 'INBOX'} />
            </div>
          )}
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
