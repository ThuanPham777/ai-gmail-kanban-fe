import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, CheckCircle } from 'lucide-react';
import type { KanbanEmailItem } from '@/lib/api';
import type { KanbanColumn } from '@/types/kanban-config.types';

function initials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase() || 'U';
}

export function SearchResults({
  items,
  onView,
  onClear,
  loading = false,
  error = null,
  searchType = 'fuzzy',
  columns,
}: {
  items: KanbanEmailItem[];
  onView: (id: string) => void;
  onClear: () => void;
  loading?: boolean;
  error?: string | null;
  searchType?: 'fuzzy' | 'semantic';
  columns?: KanbanColumn[];
}) {
  const statusLabel = (status?: string) => {
    if (!status) return '';
    const colName = columns?.find((c) => c.id === status)?.name;
    if (colName) return colName;
    if (status.startsWith('col_')) return status;
    return status
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Search className='h-4 w-4' />
          <h3 className='text-sm font-semibold'>
            Search results
            {searchType === 'semantic' && (
              <span className='ml-2 text-xs font-normal text-muted-foreground'>
                (AI-powered semantic search)
              </span>
            )}
          </h3>
        </div>
        <Button
          size='sm'
          variant='ghost'
          onClick={onClear}
        >
          ← Back to Kanban
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className='py-8'>
            <div className='flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='ml-3 text-sm text-muted-foreground'>
                Searching{searchType === 'semantic' ? ' with AI' : ''}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className='border-destructive'>
          <CardContent className='py-6'>
            <p className='text-sm text-destructive text-center'>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <Card>
          <CardContent className='py-8'>
            <div className='text-center'>
              <Search className='mx-auto h-12 w-12 text-muted-foreground/50' />
              <p className='mt-4 text-sm font-medium'>No results found</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Try different keywords or use Ctrl+Enter for AI-powered search
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className='text-xs text-muted-foreground mb-2'>
            Found {items.length} result{items.length !== 1 ? 's' : ''}
          </div>
          <div className='space-y-2'>
            {items.map((it) => (
              <Card
                key={it.messageId}
                className='p-3 hover:bg-accent/50 transition-colors'
              >
                <CardHeader>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start gap-3'>
                        <div className='flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0'>
                          {initials(it.senderName)}
                        </div>

                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between gap-2'>
                            <div className='min-w-0'>
                              <p className='text-sm font-semibold line-clamp-1'>
                                {it.senderName ?? 'Unknown'}
                              </p>
                              {it.senderEmail && (
                                <p className='text-xs text-muted-foreground line-clamp-1'>
                                  {it.senderEmail}
                                </p>
                              )}
                            </div>

                            {it._score !== undefined && (
                              <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0'>
                                {/* Fuzzy: lower score = better (invert), Semantic: higher score = better */}
                                {Math.round(
                                  ((it._searchType ?? searchType) === 'semantic'
                                    ? it._score
                                    : 1 - it._score) * 100
                                )}
                                % match
                              </span>
                            )}
                          </div>

                          <CardTitle className='mt-2 truncate'>
                            {it.subject ?? '(No subject)'}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='text-xs text-muted-foreground whitespace-nowrap'>
                        {new Date(
                          it.createdAt ?? Date.now()
                        ).toLocaleDateString()}
                      </p>
                      {it.status && (
                        <div className='flex items-center gap-1 mt-1'>
                          <CheckCircle className='h-3 w-3' />
                          <span className='text-xs capitalize'>
                            {statusLabel(it.status)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {it.summary ? (
                    <div className='rounded-lg bg-muted/40 p-2 overflow-hidden'>
                      <p className='text-[10px] font-semibold text-muted-foreground'>
                        AI Summary
                      </p>
                      <p className='text-xs leading-relaxed wrap-break-word overflow-wrap-anywhere'>
                        {it.summary}
                      </p>
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground line-clamp-2'>
                      {it.snippet || 'Summary pending...'}
                    </p>
                  )}
                </CardContent>
                <div className='px-3 pb-3 flex gap-2'>
                  <Button
                    size='sm'
                    onClick={() => onView(it.messageId)}
                  >
                    View Email
                  </Button>
                  {it.status && (
                    <span className='text-xs text-muted-foreground self-center'>
                      Currently in: {statusLabel(it.status)}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
