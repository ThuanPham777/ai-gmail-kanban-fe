import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { searchKanban, semanticSearchKanban } from '@/lib/api/kanban.api';
import { getKanbanColumns } from '@/lib/api/kanban-config.api';
import { SearchResults } from '@/components/kanban/SearchResults';
import { KanbanInboxView } from '@/components/kanban/KanbanInboxView';
import { KanbanHeader } from '@/components/kanban/KanbanHeader';
import { getGmailUrl } from '@/utils/emailUtils';
import {
  useGmailPush,
  type GmailNotification,
} from '@/hooks/email/useGmailPush';
import {
  invalidateAllEmailListsForMailbox,
  invalidateMailboxes,
} from '@/lib/db/emailCache';
import { startGmailWatch } from '@/lib/api';

/**
 * KanbanPage - Kanban board view for emails
 *
 * Features:
 * - Kanban board with drag-drop columns (To Do, In Progress, Done)
 * - Smart search (fuzzy and semantic search)
 * - Real-time updates via Gmail Push (WebSocket)
 * - Offline caching with IndexedDB
 */
export default function KanbanPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Kanban always uses INBOX
  const selectedMailbox = 'INBOX';

  // Search state (for kanban mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'fuzzy' | 'semantic'>('fuzzy');

  /**
   * Handle Gmail push notification - invalidate caches and trigger refresh
   * IMPORTANT: Must invalidate IndexedDB cache BEFORE React Query
   * to ensure fresh data is fetched from server
   */
  const handleGmailNotification = useCallback(
    async (notification: GmailNotification) => {
      console.log('🔔 Gmail notification received:', notification);

      // STEP 1: Invalidate IndexedDB cache FIRST
      await Promise.all([
        invalidateAllEmailListsForMailbox(),
        invalidateMailboxes(),
      ]);
      console.log('✅ IndexedDB cache invalidated for real-time update');

      // STEP 2: Now invalidate React Query to trigger refetch
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

  const kanbanColumnsQuery = useQuery({
    queryKey: ['kanban-columns'],
    queryFn: getKanbanColumns,
    staleTime: 60_000,
  });

  return (
    <div className='h-screen flex flex-col bg-background text-foreground overflow-hidden min-h-screen-mobile'>
      <KanbanHeader
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={doSearch}
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
          ) : (
            <div className='rounded-xl border bg-card p-2 sm:p-4 overflow-auto smooth-scroll touch-scroll'>
              <KanbanInboxView labelId={selectedMailbox} />
            </div>
          )}
        </div>
      </main>

      {/* Keyboard shortcuts are available on /inbox only */}
    </div>
  );
}
