import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMailboxes } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { searchKanban } from '@/lib/api/kanban.api';
import { SearchResults } from './components/SearchResults';
import { MailboxSidebar } from './components/MailboxSidebar';
import { ModeToggle, type InboxMode } from './components/mode-toggle';
import { TraditionalInboxView } from './components/traditional/TraditionalInboxView';
import { KanbanInboxView } from './components/kanban/KanbanInboxView';

export default function InboxPage() {
  const { user, logout } = useAuth();

  const [mode, setMode] = useState<InboxMode>('traditional');
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const doSearch = async () => {
    if (!searchQuery || !searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const resp = await searchKanban(searchQuery.trim());
      setSearchResults(resp.data ?? []);
    } catch (err: any) {
      setSearchError(err?.message ?? 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const mailboxesQuery = useQuery({
    queryKey: ['mailboxes'],
    queryFn: getMailboxes,
  });

  // auto select first mailbox for traditional
  useEffect(() => {
    if (mode === 'traditional') {
      if (!selectedMailbox && mailboxesQuery.data?.data.length) {
        setSelectedMailbox(mailboxesQuery.data.data[0].id);
      }
    }
  }, [mailboxesQuery.data, selectedMailbox, mode]);

  // when switching to kanban, force labelId = INBOX (không cần filter sidebar)
  useEffect(() => {
    if (mode === 'kanban') {
      setSelectedMailbox('INBOX');
    }
  }, [mode]);

  return (
    <div className='min-h-screen flex flex-col bg-background text-foreground'>
      <header className='border-b bg-card'>
        <div className='flex items-center justify-between gap-4 px-4 py-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-muted-foreground'>
              Mailbox
            </p>
            <h1 className='text-2xl font-semibold'>Inbox workspace</h1>
          </div>

          <div className='flex-1 px-4'>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doSearch();
              }}
              placeholder='Search emails...'
              className='w-full rounded-md border bg-input/50 px-3 py-2 text-sm'
            />
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

      <main className='flex-1'>
        <div className='p-4'>
          {searchResults ? (
            <div className='rounded-xl border bg-card p-4'>
              {searchLoading ? (
                <p className='text-sm text-muted-foreground'>Searching…</p>
              ) : searchError ? (
                <p className='text-sm text-destructive'>{searchError}</p>
              ) : (
                <SearchResults
                  items={searchResults}
                  onView={(id) => {
                    setMode('kanban');
                    setSelectedMailbox('INBOX');
                  }}
                  onClear={() => setSearchResults(null)}
                />
              )}
            </div>
          ) : mode === 'traditional' ? (
            <div className='grid gap-4 lg:grid-cols-[22%_78%]'>
              <MailboxSidebar
                mailboxes={mailboxesQuery.data?.data ?? []}
                isLoading={mailboxesQuery.isLoading}
                selectedId={selectedMailbox}
                onSelect={setSelectedMailbox}
                title='Mailboxes'
                showCompose={false}
              />

              <div className='rounded-xl border bg-card p-4'>
                {!selectedMailbox ? (
                  <div className='text-sm text-muted-foreground'>
                    Select a mailbox…
                  </div>
                ) : (
                  <TraditionalInboxView mailboxId={selectedMailbox} />
                )}
              </div>
            </div>
          ) : (
            <div className='rounded-xl border bg-card p-4'>
              <KanbanInboxView labelId={selectedMailbox ?? 'INBOX'} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
