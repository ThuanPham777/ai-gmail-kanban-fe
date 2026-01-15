import { useState, useEffect, useRef } from 'react';
import { getSearchSuggestions } from '@/lib/api/kanban.api';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { User, Search } from 'lucide-react';

interface SearchSuggestion {
  type: 'contact' | 'keyword';
  text: string;
  value: string;
}

interface SearchBarWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, isSemanticSearch?: boolean) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBarWithSuggestions({
  value,
  onChange,
  onSearch,
  placeholder = 'Search emails...',
  inputRef: externalInputRef,
}: SearchBarWithSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalInputRef ?? localInputRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const resp = await getSearchSuggestions(value, 5);
        setSuggestions(resp.data?.results ?? []);
        setShowSuggestions(resp.data?.results?.length > 0);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      onSearch(value, e.ctrlKey || e.metaKey); // Ctrl/Cmd+Enter for semantic search
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.value);
    setShowSuggestions(false);
    onSearch(suggestion.value, true); // Always use semantic search for suggestions
  };

  return (
    <div className='relative flex-1'>
      <div className='relative'>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className='w-full rounded-md border bg-input/50 px-3 py-2 text-sm pr-20'
        />
        <div className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground'>
          {loading ? 'Loading...' : 'Ctrl+Enter: AI'}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className='absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg'
        >
          <Command>
            <CommandList>
              <CommandGroup heading='Suggestions'>
                {suggestions.map((suggestion, idx) => (
                  <CommandItem
                    key={idx}
                    onSelect={() => handleSuggestionClick(suggestion)}
                    className='cursor-pointer'
                  >
                    {suggestion.type === 'contact' ? (
                      <User className='mr-2 h-4 w-4' />
                    ) : (
                      <Search className='mr-2 h-4 w-4' />
                    )}
                    <div className='flex flex-col'>
                      <span>{suggestion.text}</span>
                      {suggestion.type === 'contact' && (
                        <span className='text-xs text-muted-foreground'>
                          {suggestion.value}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
