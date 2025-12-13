import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Clock, TrendingUp, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockContent, mockCreators, trendingTags } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'neon art', 'vr experience', 'mountain adventure'
  ]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
      setShowSuggestions(false);
      // Add to recent searches
      if (!recentSearches.includes(searchInput.trim())) {
        setRecentSearches(prev => [searchInput.trim(), ...prev.slice(0, 4)]);
      }
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchParams({});
  };

  // Filter results
  const contentResults = mockContent.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const creatorResults = mockCreators.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.username.toLowerCase().includes(query.toLowerCase())
  );

  // Suggestions based on input
  const suggestions = query
    ? [...new Set([
        ...mockContent.filter(c => c.title.toLowerCase().includes(searchInput.toLowerCase())).map(c => c.title),
        ...trendingTags.filter(t => t.includes(searchInput.toLowerCase()))
      ])].slice(0, 5)
    : [];

  return (
    <>
      <Helmet>
        <title>{query ? `Search: ${query}` : 'Search'} - DreamLust</title>
        <meta name="description" content="Search for content, creators, and more on DreamLust." />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
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

          {/* Results */}
          {query ? (
            <div className="space-y-8">
              {/* Creators */}
              {creatorResults.length > 0 && (
                <div>
                  <h2 className="font-display text-xl font-bold mb-4">Creators</h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {creatorResults.map(creator => (
                      <Link
                        key={creator.id}
                        to={`/creator/${creator.username}`}
                        className="flex-shrink-0 flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/50 transition-colors"
                      >
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{creator.name}</p>
                          <p className="text-sm text-muted-foreground">@{creator.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div>
                <h2 className="font-display text-xl font-bold mb-4">
                  {contentResults.length} results for "{query}"
                </h2>
                {contentResults.length > 0 ? (
                  <ContentGrid content={contentResults} columns={4} />
                ) : (
                  <div className="text-center py-16">
                    <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No results found</h3>
                    <p className="text-muted-foreground">Try different keywords or browse trending content</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Search DreamLust</h3>
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
      </Layout>
    </>
  );
}
