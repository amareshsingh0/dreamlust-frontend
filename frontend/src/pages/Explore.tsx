import { useState, useEffect, useCallback } from 'react';
import { Filter, SlidersHorizontal, Grid, List, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { ContentCard } from '@/components/content/ContentCard';
import { VirtualizedContentGrid } from '@/components/content/VirtualizedContentGrid';
import { VirtualizedContentList } from '@/components/content/VirtualizedContentList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { mockCategories, trendingTags } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';
import { api } from '@/lib/api';
import type { Content } from '@/types';

export default function Explore() {
  const [sortBy, setSortBy] = useState('trending');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  const contentTypes = [
    { value: 'VIDEO', label: 'Videos' },
    { value: 'PHOTO', label: 'Photos' },
    { value: 'VR', label: 'VR' },
    { value: 'LIVE_STREAM', label: 'Live' },
  ];

  // Map frontend sort values to backend
  const sortMap: Record<string, string> = {
    trending: 'trending',
    recent: 'recent',
    views: 'views',
    rating: 'rating',
  };

  // Fetch content from API
  const fetchContent = useCallback(async (resetPage = false) => {
    setLoading(true);
    try {
      const currentPage = resetPage ? 1 : page;

      const response = await api.search.post<{
        results: Content[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>({
        query: '',
        filters: {
          type: selectedTypes.length > 0 ? selectedTypes : undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        },
        sort: sortMap[sortBy] || 'trending',
        page: currentPage,
        limit: 24,
      });

      if (response.success && response.data) {
        const newContent = response.data.results || [];
        if (resetPage) {
          setContent(newContent);
          setPage(1);
        } else {
          setContent(prev => [...prev, ...newContent]);
        }
        setTotalResults(response.data.total || newContent.length);
        setHasMore(currentPage < (response.data.totalPages || 1));
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, selectedCategories, sortBy, page]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchContent(true);
  }, [selectedTypes, selectedCategories, sortBy]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Filter by tags (client-side since not supported in search API)
  let filteredContent = content;
  if (selectedTags.length > 0) {
    filteredContent = content.filter(c =>
      selectedTags.some(tag => c.tags?.includes(tag))
    );
  }

  const activeFiltersCount = selectedCategories.length + selectedTypes.length + selectedTags.length;

  return (
    <>
      <Helmet>
        <title>Explore Content - PassionFantasia</title>
        <meta name="description" content="Explore and discover amazing content with advanced filters and sorting options." />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Explore</h1>
            <p className="text-muted-foreground">Discover amazing content from creators worldwide</p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Filter Sheet (Mobile) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  {/* Content Types */}
                  <div>
                    <h3 className="font-medium mb-3">Content Type</h3>
                    <div className="space-y-2">
                      {contentTypes.map(type => (
                        <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox 
                            checked={selectedTypes.includes(type.value)}
                            onCheckedChange={() => toggleType(type.value)}
                          />
                          <span>{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <h3 className="font-medium mb-3">Categories</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {mockCategories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedCategories.includes(cat.id)}
                            onCheckedChange={() => toggleCategory(cat.id)}
                          />
                          <span>{cat.icon} {cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {activeFiltersCount > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setSelectedCategories([]);
                        setSelectedTypes([]);
                        setSelectedTags([]);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {trendingTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>

          {/* Results */}
          <div className="mb-4 text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${totalResults} results`}
          </div>

          {/* Content */}
          {loading && content.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No content found. Try adjusting your filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            filteredContent.length > 50 ? (
              <VirtualizedContentGrid
                content={filteredContent}
                columns={4}
              />
            ) : (
              <ContentGrid content={filteredContent} columns={4} />
            )
          ) : (
            filteredContent.length > 50 ? (
              <VirtualizedContentList content={filteredContent} />
            ) : (
              <div className="space-y-2">
                {filteredContent.map(item => (
                  <ContentCard key={item.id} content={item} variant="horizontal" />
                ))}
              </div>
            )
          )}

          {/* Load More Button */}
          {hasMore && !loading && content.length > 0 && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(prev => prev + 1);
                  fetchContent(false);
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
