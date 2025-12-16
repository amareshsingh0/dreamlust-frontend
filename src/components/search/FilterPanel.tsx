import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DualRangeSlider } from './DualRangeSlider';
import { SearchableCheckboxList } from './SearchableCheckboxList';
import { cn } from '@/lib/utils';

export interface FilterValues {
  contentType: ('video' | 'photo' | 'vr' | 'live')[];
  categories: string[];
  tags: string[];
  quality: ('720p' | '1080p' | '4K')[];
  duration: { min: number; max: number } | null;
  releaseDate: '24h' | '7d' | '30d' | 'custom' | null;
  releaseDateCustom?: { from: Date; to: Date };
  creators: string[];
  language: string[];
}

interface FilterPanelProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  categories?: { id: string; name: string; count?: number }[];
  tags?: { id: string; name: string; count?: number }[];
  className?: string;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-sm font-semibold hover:text-primary transition-colors">
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FilterPanel({
  filters,
  onFiltersChange,
  categories = [],
  tags = [],
  className,
}: FilterPanelProps) {
  const updateFilter = <K extends keyof FilterValues>(
    key: K,
    value: FilterValues[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      contentType: [],
      categories: [],
      tags: [],
      quality: [],
      duration: null,
      releaseDate: null,
      creators: [],
      language: [],
    });
  };

  const hasActiveFilters = 
    filters.contentType.length > 0 ||
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.quality.length > 0 ||
    filters.duration !== null ||
    filters.releaseDate !== null ||
    filters.creators.length > 0 ||
    filters.language.length > 0;

  return (
    <div className={cn('w-64 border-r border-border bg-card', className)}>
      <div className="sticky top-0 bg-card z-10 border-b border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Filters</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Content Type */}
        <FilterSection title="Content Type">
          <div className="space-y-2">
            {(['video', 'photo', 'vr', 'live'] as const).map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`content-type-${type}`}
                  checked={filters.contentType.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilter('contentType', [...filters.contentType, type]);
                    } else {
                      updateFilter(
                        'contentType',
                        filters.contentType.filter((t) => t !== type)
                      );
                    }
                  }}
                />
                <Label
                  htmlFor={`content-type-${type}`}
                  className="text-sm font-normal cursor-pointer capitalize"
                >
                  {type === 'vr' ? 'VR' : type === 'live' ? 'Live' : type}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <FilterSection title="Categories">
              <SearchableCheckboxList
                items={categories}
                selectedIds={filters.categories}
                onSelectionChange={(ids) => updateFilter('categories', ids)}
              />
            </FilterSection>
            <Separator />
          </>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <FilterSection title="Tags">
              <SearchableCheckboxList
                items={tags}
                selectedIds={filters.tags}
                onSelectionChange={(ids) => updateFilter('tags', ids)}
              />
            </FilterSection>
            <Separator />
          </>
        )}

        {/* Quality */}
        <FilterSection title="Quality">
          <div className="space-y-2">
            {(['720p', '1080p', '4K'] as const).map((quality) => (
              <div key={quality} className="flex items-center space-x-2">
                <Checkbox
                  id={`quality-${quality}`}
                  checked={filters.quality.includes(quality)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilter('quality', [...filters.quality, quality]);
                    } else {
                      updateFilter(
                        'quality',
                        filters.quality.filter((q) => q !== quality)
                      );
                    }
                  }}
                />
                <Label
                  htmlFor={`quality-${quality}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {quality}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Duration */}
        <FilterSection title="Duration">
          <div className="space-y-2">
            <DualRangeSlider
              min={0}
              max={120}
              value={filters.duration ? [filters.duration.min, filters.duration.max] : [0, 120]}
              onChange={([min, max]) => {
                updateFilter('duration', { min, max });
              }}
              unit="min"
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filters.duration && filters.duration.max <= 10 ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('duration', { min: 0, max: 10 })}
                data-testid="filter-duration-short"
                className="text-xs"
              >
                Short (&lt;10min)
              </Button>
              <Button
                variant={filters.duration && filters.duration.min >= 10 && filters.duration.max <= 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('duration', { min: 10, max: 30 })}
                data-testid="filter-duration-medium"
                className="text-xs"
              >
                Medium (10-30min)
              </Button>
              <Button
                variant={filters.duration && filters.duration.min >= 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('duration', { min: 30, max: 120 })}
                data-testid="filter-duration-long"
                className="text-xs"
              >
                Long (&gt;30min)
              </Button>
            </div>
          </div>
        </FilterSection>

        <Separator />

        {/* Release Date */}
        <FilterSection title="Release Date">
          <RadioGroup
            value={filters.releaseDate || ''}
            onValueChange={(value) => {
              updateFilter('releaseDate', value as FilterValues['releaseDate']);
            }}
          >
            <div className="space-y-2">
              {[
                { value: '24h', label: 'Last 24 hours' },
                { value: '7d', label: 'Last week' },
                { value: '30d', label: 'Last month' },
                { value: 'custom', label: 'Custom range' },
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`date-${option.value}`} />
                  <Label
                    htmlFor={`date-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          {filters.releaseDate === 'custom' && (
            <div className="mt-3 space-y-2">
              <div>
                <Label htmlFor="release-date-from" className="text-xs text-muted-foreground mb-1 block">From</Label>
                <input
                  id="release-date-from"
                  name="release-date-from"
                  type="date"
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={
                    filters.releaseDateCustom?.from
                      ? filters.releaseDateCustom.from.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const from = e.target.value ? new Date(e.target.value) : new Date();
                    updateFilter('releaseDateCustom', {
                      from,
                      to: filters.releaseDateCustom?.to || new Date(),
                    });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="release-date-to" className="text-xs text-muted-foreground mb-1 block">To</Label>
                <input
                  id="release-date-to"
                  name="release-date-to"
                  type="date"
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={
                    filters.releaseDateCustom?.to
                      ? filters.releaseDateCustom.to.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const to = e.target.value ? new Date(e.target.value) : new Date();
                    updateFilter('releaseDateCustom', {
                      from: filters.releaseDateCustom?.from || new Date(),
                      to,
                    });
                  }}
                />
              </div>
            </div>
          )}
        </FilterSection>
      </div>
    </div>
  );
}

