import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { KanbanEmailItem } from '@/lib/api';

export function SearchResults({
  items,
  onView,
  onClear,
}: {
  items: KanbanEmailItem[];
  onView: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold'>Search results</h3>
        <Button
          size='sm'
          variant='ghost'
          onClick={onClear}
        >
          Clear search
        </Button>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent>
            <p className='text-sm text-muted-foreground'>No results found</p>
          </CardContent>
        </Card>
      )}

      <div className='space-y-2'>
        {items.map((it) => (
          <Card
            key={it.messageId}
            className='p-3'
          >
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>{it.subject ?? '(No subject)'}</CardTitle>
                  <CardDescription>
                    {it.senderName ?? it.senderEmail}
                  </CardDescription>
                </div>
                <div className='text-right'>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(it.createdAt ?? Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground line-clamp-3'>
                {it.snippet ?? it.summary}
              </p>
            </CardContent>
            <div className='p-3 pt-0'>
              <Button
                size='sm'
                onClick={() => onView(it.messageId)}
              >
                View
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
