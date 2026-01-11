import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Clock, TrendingUp, X, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { VirtualizedContentGrid } from '@/components/content/VirtualizedContentGrid';
import { FilterPanel, FilterValues } from '@/components/search/FilterPanel';
import { FilterChip } from '@/components/search/FilterChip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { Content } from '@/types';
import { Helmet } from 'react-helmet-async';
import { trendingTags } from '@/data/mockData';

interface SearchResponse {
  results: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: {
    categories: { id: string; name: string; count: number }[];
    tags: { id: string; name: string; count: number }[];
  };
}

// Convert frontend filter format to backend API format
function convertFiltersToApi(filters: FilterValues) {
  const contentTypeMap: Record<string, string> = {
    video: 'VIDEO',
    photo: 'PHOTO',
    vr: 'VR',
    live: 'LIVE_STREAM',
  };

  const apiFilters: any = {
    categories: filters.categories,
    tags: filters.tags,
    contentType: filters.contentType.map(t => contentTypeMap[t] || t.toUpperCase()),
    quality: filters.quality,
    creators: filters.creators,
    language: filters.language,
  };

  if (filters.duration) {
    apiFilters.duration = {
      min: filters.duration.min * 60, // Convert minutes to seconds
      max: filters.duration.max * 60,
    };
  }

  if (filters.releaseDate) {
    const now = new Date();
    let from: Date | undefined;
    let to: Date = now;

    switch (filters.releaseDate) {
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (filters.releaseDateCustom) {
          from = filters.releaseDateCustom.from;
          to = filters.releaseDateCustom.to;
        }
        break;
    }

    if (from) {
      apiFilters.releaseDate = { from, to };
    }
  }

  return apiFilters;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Search state
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'trending' | 'recent' | 'views' | 'rating'>('trending');
  
  // Filter state
  const [filters, setFilters] = useState<FilterValues>({
    contentType: [],
    categories: [],
    tags: [],
    quality: [],
    duration: null,
    releaseDate: null,
    creators: [],
    language: [],
  });
  
  // Facets for filters
  const [facets, setFacets] = useState<{
    categories: { id: string; name: string; count: number }[];
    tags: { id: string; name: string; count: number }[];
  }>({
    categories: [],
    tags: [],
  });

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!query.trim() && 
        filters.contentType.length === 0 &&
        filters.categories.length === 0 &&
        filters.tags.length === 0) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiFilters = convertFiltersToApi(filters);
      
      const response = await api.search.post<SearchResponse>({
        query: query.trim(),
        filters: apiFilters,
        sort,
        page,
        limit: 20,
      });

      if (response.success && response.data) {
        setResults(response.data.results);
        setTotal(response.data.total);
        setFacets(response.data.facets);
      } else {
        setError(response.error?.message || 'Search failed');
        setResults([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, filters, sort, page]);

  // Search when query, filters, sort, or page changes
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Update search input when query param changes
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
      setPage(1);
      setShowSuggestions(false);
      
      // Add to recent searches
      const updated = [searchInput.trim(), ...recentSearches.filter(s => s !== searchInput.trim())].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchParams({});
    setPage(1);
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSortChange = (newSort: 'trending' | 'recent' | 'views' | 'rating') => {
    setSort(newSort);
    setPage(1);
  };

  // Get active filters as chips
  const getActiveFilters = () => {
    const activeFilters: Array<{ id: string; label: string; remove: () => void }> = [];

    // Content types
    filters.contentType.forEach((type) => {
      activeFilters.push({
        id: `content-type-${type}`,
        label: type === 'vr' ? 'VR' : type === 'live' ? 'Live' : type.charAt(0).toUpperCase() + type.slice(1),
        remove: () => {
          setFilters({
            ...filters,
            contentType: filters.contentType.filter((t) => t !== type),
          });
          setPage(1);
        },
      });
    });

    // Categories
    filters.categories.forEach((categoryId) => {
      const category = facets.categories.find((c) => c.id === categoryId);
      if (category) {
        activeFilters.push({
          id: `category-${categoryId}`,
          label: category.name,
          remove: () => {
            setFilters({
              ...filters,
              categories: filters.categories.filter((id) => id !== categoryId),
            });
            setPage(1);
          },
        });
      }
    });

    // Tags
    filters.tags.forEach((tagId) => {
      const tag = facets.tags.find((t) => t.id === tagId);
      if (tag) {
        activeFilters.push({
          id: `tag-${tagId}`,
          label: tag.name,
          remove: () => {
            setFilters({
              ...filters,
              tags: filters.tags.filter((id) => id !== tagId),
            });
            setPage(1);
          },
        });
      }
    });

    // Quality
    filters.quality.forEach((quality) => {
      activeFilters.push({
        id: `quality-${quality}`,
        label: quality,
        remove: () => {
          setFilters({
            ...filters,
            quality: filters.quality.filter((q) => q !== quality),
          });
          setPage(1);
        },
      });
    });

    // Duration
    if (filters.duration) {
      activeFilters.push({
        id: 'duration',
        label: `${filters.duration.min}-${filters.duration.max} min`,
        remove: () => {
          setFilters({
            ...filters,
            duration: null,
          });
          setPage(1);
        },
      });
    }

    // Release date
    if (filters.releaseDate) {
      let label = '';
      switch (filters.releaseDate) {
        case '24h':
          label = 'Last 24 hours';
          break;
        case '7d':
          label = 'Last week';
          break;
        case '30d':
          label = 'Last month';
          break;
        case 'custom':
          if (filters.releaseDateCustom) {
            const from = filters.releaseDateCustom.from.toLocaleDateString();
            const to = filters.releaseDateCustom.to.toLocaleDateString();
            label = `${from} - ${to}`;
          }
          break;
      }
      if (label) {
        activeFilters.push({
          id: 'release-date',
          label,
          remove: () => {
            setFilters({
              ...filters,
              releaseDate: null,
              releaseDateCustom: undefined,
            });
            setPage(1);
          },
        });
      }
    }

    // Creators
    filters.creators.forEach((creatorId) => {
      activeFilters.push({
        id: `creator-${creatorId}`,
        label: `Creator: ${creatorId}`,
        remove: () => {
          setFilters({
            ...filters,
            creators: filters.creators.filter((id) => id !== creatorId),
          });
          setPage(1);
        },
      });
    });

    // Language
    filters.language.forEach((lang) => {
      activeFilters.push({
        id: `language-${lang}`,
        label: `Language: ${lang}`,
        remove: () => {
          setFilters({
            ...filters,
            language: filters.language.filter((l) => l !== lang),
          });
          setPage(1);
        },
      });
    });

    return activeFilters;
  };

  const activeFilters = getActiveFilters();

  // Suggestions based on input
  const suggestions = searchInput
    ? trendingTags
        .filter(t => t.toLowerCase().includes(searchInput.toLowerCase()))
        .slice(0, 5)
    : [];

  return (
    <>
      <Helmet>
        <title>{query ? `Search: ${query}` : 'Search'} - PassionFantasia</title>
        <meta name="description" content="Search for content, creators, and more on PassionFantasia." />
      </Helmet>
      
      <Layout>
        <div className="flex gap-6">
          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={facets.categories}
            tags={facets.tags}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="container mx-auto px-4 py-8">
              {/* Search Box */}
              <div className="max-w-2xl mx-auto mb-8">
                <form onSubmit={handleSearch} className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="search-input"
                    name="search-input"
                    type="search"
                    data-testid="search-input"
                    placeholder="Search content, creators, tags..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="pl-12 pr-12 h-14 text-lg bg-card border-border/50 focus:border-primary/50"
                  />
                  {searchInput && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={clearSearch}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}

                  {/* Suggestions Dropdown */}
                  {showSuggestions && (searchInput || recentSearches.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                      {searchInput && suggestions.length > 0 && (
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground px-2 py-1">Suggestions</p>
                          {suggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors"
                              onClick={() => {
                                setSearchInput(suggestion);
                                setSearchParams({ q: suggestion });
                                setShowSuggestions(false);
                              }}
                            >
                              <SearchIcon className="inline h-4 w-4 mr-2 text-muted-foreground" />
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      {!searchInput && recentSearches.length > 0 && (
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Recent Searches
                          </p>
                          {recentSearches.map((search, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors"
                              onClick={() => {
                                setSearchInput(search);
                                setSearchParams({ q: search });
                                setShowSuggestions(false);
                              }}
                            >
                              <Clock className="inline h-4 w-4 mr-2 text-muted-foreground" />
                              {search}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="p-2 border-t border-border">
                        <p className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Trending
                        </p>
                        <div className="flex flex-wrap gap-2 px-2 py-1">
                          {trendingTags.slice(0, 6).map(tag => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => {
                                setSearchInput(tag);
                                setSearchParams({ q: tag });
                                setShowSuggestions(false);
                              }}
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Sort and Results Header */}
              {(query || results.length > 0 || loading) && (
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Searching...</span>
                      </div>
                    ) : (
                      <h2 className="font-display text-xl font-bold">
                        {total > 0 ? (
                          <>
                            {total} result{total !== 1 ? 's' : ''}
                            {query && ` for "${query}"`}
                          </>
                        ) : query ? (
                          'No results found'
                        ) : (
                          'Search Results'
                        )}
                      </h2>
                    )}
                  </div>
                  <Select value={sort} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="recent">Recent</SelectItem>
                      <SelectItem value="views">Most Views</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Active Filter Chips */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {activeFilters.map((filter) => (
                    <FilterChip
                      key={filter.id}
                      label={filter.label}
                      onRemove={filter.remove}
                    />
                  ))}
                </div>
              )}

              {/* Results */}
              {error && (
                <div className="text-center py-16">
                  <p className="text-destructive mb-2">{error}</p>
                  <Button onClick={performSearch} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <div data-testid="search-results">
                  {results.length > 50 ? (
                    <VirtualizedContentGrid 
                      content={results} 
                      columns={4}
                      isLoading={loading}
                    />
                  ) : (
                    <ContentGrid content={results} columns={4} />
                  )}
                </div>
              )}

              {!loading && !error && results.length === 0 && query && (
                <div className="text-center py-16">
                  <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No results found</h3>
                  <p className="text-muted-foreground">Try different keywords or adjust your filters</p>
                </div>
              )}

              {!query && results.length === 0 && !loading && (
                <div className="text-center py-16">
                  <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Search PassionFantasia</h3>
                  <p className="text-muted-foreground mb-6">Find content, creators, and more</p>
                  
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {trendingTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20 text-sm py-1 px-3"
                        onClick={() => setSearchParams({ q: tag })}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
