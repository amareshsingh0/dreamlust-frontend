import { useState } from 'react';
import { Filter, SlidersHorizontal, Grid, List } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { ContentCard } from '@/components/content/ContentCard';
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
import { mockContent, mockCategories, trendingTags } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';

export default function Explore() {
  const [sortBy, setSortBy] = useState('trending');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const contentTypes = [
    { value: 'video', label: 'Videos' },
    { value: 'photo', label: 'Photos' },
    { value: 'gallery', label: 'Galleries' },
    { value: 'vr', label: 'VR' },
    { value: 'live', label: 'Live' },
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Filter and sort content
  let filteredContent = [...mockContent];
  
  if (selectedCategories.length > 0) {
    filteredContent = filteredContent.filter(c => 
      selectedCategories.some(cat => c.category.toLowerCase().includes(cat))
    );
  }
  
  if (selectedTypes.length > 0) {
    filteredContent = filteredContent.filter(c => selectedTypes.includes(c.type));
  }

  if (selectedTags.length > 0) {
    filteredContent = filteredContent.filter(c =>
      selectedTags.some(tag => c.tags.includes(tag))
    );
  }

  // Sort
  switch (sortBy) {
    case 'views':
      filteredContent.sort((a, b) => b.views - a.views);
      break;
    case 'recent':
      filteredContent.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'rating':
      filteredContent.sort((a, b) => b.likes - a.likes);
      break;
    default:
      // trending - combination of views and recency
      filteredContent.sort((a, b) => {
        const aScore = a.views + (new Date(a.createdAt).getTime() / 1000000);
        const bScore = b.views + (new Date(b.createdAt).getTime() / 1000000);
        return bScore - aScore;
      });
  }

  const activeFiltersCount = selectedCategories.length + selectedTypes.length + selectedTags.length;

  return (
    <>
      <Helmet>
        <title>Explore Content - DreamLust</title>
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
                            checked={selectedCategories.includes(cat.slug)}
                            onCheckedChange={() => toggleCategory(cat.slug)}
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
            {filteredContent.length} results
          </div>

          {/* Content */}
          {viewMode === 'grid' ? (
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
        </div>
      </Layout>
    </>
  );
}
