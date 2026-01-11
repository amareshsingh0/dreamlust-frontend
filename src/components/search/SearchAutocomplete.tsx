/**
 * Search Autocomplete Component
 * 
 * Provides autocomplete suggestions, trending searches, and recent searches
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Clock, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

interface AutocompleteData {
  suggestions: string[];
  trending: string[];
  recent: string[];
}

interface SearchAutocompleteProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (query: string) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
}

export function SearchAutocomplete({
  query,
  onQueryChange: _onQueryChange,
  onSelect,
  showSuggestions,
  onShowSuggestionsChange,
}: SearchAutocompleteProps) {
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    suggestions: [],
    trending: [],
    recent: [],
  });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete data
  useEffect(() => {
    if (!showSuggestions) return;

    const fetchAutocomplete = async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const response = await api.search.autocomplete<AutocompleteData>(query);
          if (response.success && response.data) {
            const data = response.data as unknown as AutocompleteData;
            setAutocompleteData(data);
          }
        } catch (error) {
          console.warn('Failed to fetch autocomplete:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // Show trending and recent when query is short
        try {
          const response = await api.search.getTrending();
          if (response.success && response.data) {
            const trendingData = response.data as unknown as any[];
            setAutocompleteData({
              suggestions: [],
              trending: trendingData.map((t: any) => t.query).slice(0, 5),
              recent: autocompleteData.recent,
            });
          }
        } catch (error) {
          console.warn('Failed to fetch trending:', error);
        }
      }
    };

    const debounceTimer = setTimeout(fetchAutocomplete, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, showSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onShowSuggestionsChange(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions, onShowSuggestionsChange]);

  const handleSuggestionClick = (suggestion: string) => {
    onSelect(suggestion);
    onShowSuggestionsChange(false);
  };

  if (!showSuggestions) return null;

  const hasContent =
    autocompleteData.suggestions.length > 0 ||
    autocompleteData.trending.length > 0 ||
    autocompleteData.recent.length > 0;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto"
    >
      {loading && (
        <div className="p-4 text-center text-muted-foreground">Loading suggestions...</div>
      )}

      {!loading && !hasContent && query.length >= 2 && (
        <div className="p-4 text-center text-muted-foreground">No suggestions found</div>
      )}

      {!loading && hasContent && (
        <div className="p-2">
          {/* Suggestions */}
          {autocompleteData.suggestions.length > 0 && (
            <Section
              title="Suggestions"
              items={autocompleteData.suggestions}
              onItemClick={handleSuggestionClick}
              highlightQuery={query}
            />
          )}

          {/* Trending */}
          {autocompleteData.trending.length > 0 && (
            <Section
              title="Trending"
              items={autocompleteData.trending}
              onItemClick={handleSuggestionClick}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          )}

          {/* Recent Searches */}
          {autocompleteData.recent.length > 0 && (
            <Section
              title="Recent Searches"
              items={autocompleteData.recent}
              onItemClick={handleSuggestionClick}
              icon={<Clock className="h-4 w-4" />}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  items: string[];
  onItemClick: (item: string) => void;
  highlightQuery?: string;
  icon?: React.ReactNode;
}

function Section({ title, items, onItemClick, highlightQuery, icon }: SectionProps) {
  const highlightMatch = (text: string, query?: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="mb-2">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
        {icon}
        {title}
      </div>
      {items.map((item, index) => (
        <button
          key={`${item}-${index}`}
          onClick={() => onItemClick(item)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md flex items-center gap-2"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span>{highlightQuery ? highlightMatch(item, highlightQuery) : item}</span>
        </button>
      ))}
    </div>
  );
}

