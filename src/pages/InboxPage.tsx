import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMailboxes } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchKanban, semanticSearchKanban } from '@/lib/api/kanban.api';
import { SearchResults } from '../components/inbox/SearchResults';
import { SearchBarWithSuggestions } from '../components/inbox/SearchBarWithSuggestions';
import { MailboxSidebar } from '../components/inbox/MailboxSidebar';
import { ModeToggle, type InboxMode } from '../components/inbox/mode-toggle';
import { TraditionalInboxView } from '../components/inbox/traditional/TraditionalInboxView';
import { KanbanInboxView } from '../components/inbox/kanban/KanbanInboxView';

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
 *
 * Architecture:
 * - Traditional mode: 3-column layout (mailboxes, email list, email detail)
 * - Kanban mode: Board with drag-drop columns (To Do, In Progress, Done)
 */
export default function InboxPage() {
  const { user, logout } = useAuth();

  // View mode and mailbox selection
  const [mode, setMode] = useState<InboxMode>('traditional');
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);

  // Search state (for kanban mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'fuzzy' | 'semantic'>('fuzzy');

  // Email filtering (for traditional mode)
  const [emailSearchTerm, setEmailSearchTerm] = useState('');

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
      setSearchResults(resp.data ?? []);
    } catch (err: any) {
      setSearchError(err?.message ?? 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch mailboxes (labels) from Gmail API
  const mailboxesQuery = useQuery({
    queryKey: ['mailboxes'],
    queryFn: getMailboxes,
  });

  /**
   * Auto-select first mailbox when entering traditional mode
   * Ensures there's always a selected mailbox in traditional view
   */
  useEffect(() => {
    if (mode === 'traditional') {
      if (!selectedMailbox && mailboxesQuery.data?.data.length) {
        setSelectedMailbox(mailboxesQuery.data.data[0].id);
      }
    }
  }, [mailboxesQuery.data, selectedMailbox, mode]);

  /**
   * Force INBOX selection when switching to kanban mode
   * Kanban only works with INBOX emails
   */
  useEffect(() => {
    if (mode === 'kanban') {
      setSelectedMailbox('INBOX');
    }
  }, [mode]);

  return (
    <div className='h-screen flex flex-col bg-background text-foreground overflow-hidden'>
      <header className='border-b bg-card shrink-0'>
        <div className='flex items-center justify-between gap-4 px-4 py-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-muted-foreground'>
              Mailbox
            </p>
            <h1 className='text-2xl font-semibold'>Inbox workspace</h1>
          </div>

          <div className='flex-1 px-4'>
            {mode === 'traditional' ? (
              <Input
                type='search'
                placeholder='Search emails...'
                className='w-full'
                value={emailSearchTerm}
                onChange={(e) => setEmailSearchTerm(e.target.value)}
              />
            ) : (
              <SearchBarWithSuggestions
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={doSearch}
                placeholder='Search emails... (Ctrl+Enter for AI search)'
              />
            )}
          </div>

          <div className='flex items-center gap-3'>
            <ModeToggle
              mode={mode}
              onChange={setMode}
            />
            <div className='text-right'>
              <p className='text-sm font-medium'>{user?.email}</p>
              <p className='text-xs text-muted-foreground'>
                {user?.provider ?? 'password'} session
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className='flex-1 overflow-hidden min-h-0'>
        <div className='h-full p-4 flex flex-col min-h-0'>
          {searchResults !== null || searchLoading ? (
            <div className='rounded-xl border bg-card p-4 overflow-auto'>
              <SearchResults
                items={searchResults || []}
                loading={searchLoading}
                error={searchError}
                searchType={searchType}
                onView={() => {
                  setSearchResults(null);
                  setMode('kanban');
                  setSelectedMailbox('INBOX');
                }}
                onClear={() => {
                  setSearchResults(null);
                  setSearchError(null);
                  setSearchQuery('');
                }}
              />
            </div>
          ) : mode === 'traditional' ? (
            <div className='grid gap-4 lg:grid-cols-[18%_82%] h-full min-h-0'>
              <MailboxSidebar
                mailboxes={mailboxesQuery.data?.data ?? []}
                isLoading={mailboxesQuery.isLoading}
                selectedId={selectedMailbox}
                onSelect={setSelectedMailbox}
                title='Mailboxes'
                showCompose={false}
              />

              <div className='rounded-xl border bg-card p-4 overflow-hidden'>
                {!selectedMailbox ? (
                  <div className='text-sm text-muted-foreground'>
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
            <div className='rounded-xl border bg-card p-4 overflow-auto'>
              <KanbanInboxView labelId={selectedMailbox ?? 'INBOX'} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
