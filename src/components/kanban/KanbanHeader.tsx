import { type RefObject } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SearchBarWithSuggestions } from './SearchBarWithSuggestions';

interface KanbanHeaderProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: (query?: string, isSemanticSearch?: boolean) => void;
  userEmail?: string;
  userProvider?: string;
  onLogout: () => void;
}

/**
 * KanbanHeader Component
 *
 * Header for Kanban page view
 * Contains:
 * - Mailbox branding
 * - Smart search bar with suggestions
 * - Keyboard shortcuts help button
 * - Navigation toggle (Inbox/Kanban)
 * - User info and logout
 */
export function KanbanHeader({
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  userEmail,
  userProvider,
  onLogout,
}: KanbanHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isKanban = location.pathname === '/kanban';

  return (
    <header className='border-b bg-card shrink-0 safe-area-inset-top'>
      <div className='flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-3 sm:py-4'>
        <div className='hidden md:block'>
          <p className='text-xs uppercase tracking-[0.3em] text-muted-foreground'>
            Mailbox
          </p>
          <h1 className='text-xl sm:text-2xl font-semibold'>Kanban Board</h1>
        </div>

        {/* Mobile-only compact title */}
        <div className='md:hidden'>
          <h1 className='text-lg font-semibold'>Kanban</h1>
        </div>

        <div className='flex-1 px-2 sm:px-4 max-w-2xl'>
          <SearchBarWithSuggestions
            inputRef={searchInputRef}
            value={searchQuery}
            onChange={onSearchQueryChange}
            onSearch={onSearch}
            placeholder='Search...'
          />
        </div>

        <div className='flex items-center gap-3'>
          {/* Navigation Toggle */}
          <div className='flex items-center gap-2'>
            <Button
              variant={!isKanban ? 'default' : 'outline'}
              size='sm'
              onClick={() => navigate('/inbox')}
            >
              Inbox
            </Button>
            <Button
              variant={isKanban ? 'default' : 'outline'}
              size='sm'
              onClick={() => navigate('/kanban')}
            >
              Kanban
            </Button>
          </div>

          <div className='text-right hidden lg:block'>
            <p className='text-sm font-medium'>{userEmail}</p>
            <p className='text-xs text-muted-foreground'>
              {userProvider ?? 'password'} session
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={onLogout}
            className='hidden sm:flex'
          >
            Logout
          </Button>
          {/* Mobile logout button - icon only */}
          <Button
            variant='outline'
            size='sm'
            onClick={onLogout}
            className='sm:hidden p-2'
            aria-label='Logout'
          >
            <span className='text-xs'>Exit</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
