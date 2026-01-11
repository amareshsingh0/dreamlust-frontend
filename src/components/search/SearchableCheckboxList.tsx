import { useState, useMemo, useId } from 'react';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchableCheckboxItem {
  id: string;
  name: string;
  count?: number;
}

interface SearchableCheckboxListProps {
  items: SearchableCheckboxItem[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxHeight?: string;
  className?: string;
}

export function SearchableCheckboxList({
  items,
  selectedIds,
  onSelectionChange,
  maxHeight = '200px',
  className,
}: SearchableCheckboxListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputId = useId();

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleToggle = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={inputId}
          name={inputId}
          type="search"
          placeholder="Search content, creator, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <ScrollArea className="w-full" style={{ maxHeight }}>
        <div className="space-y-2 pr-4">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-2 py-1.5 hover:bg-muted/50 rounded-md px-1 cursor-pointer"
                onClick={() => handleToggle(item.id)}
                data-testid={`filter-category-${item.id}`}
              >
                <Checkbox
                  id={`checkbox-${item.id}`}
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => handleToggle(item.id)}
                />
                <Label
                  htmlFor={`checkbox-${item.id}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {item.name}
                  {item.count !== undefined && (
                    <span className="text-muted-foreground ml-2">({item.count})</span>
                  )}
                </Label>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No items found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

