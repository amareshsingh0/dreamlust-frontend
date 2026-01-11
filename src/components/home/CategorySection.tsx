import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface CategoryApiItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

// Default icons for categories without custom icons
const defaultIcons: Record<string, string> = {
  'art': '🎨',
  'design': '🎨',
  'adventure': '⛰️',
  'travel': '⛰️',
  'photography': '📷',
  'photo': '📷',
  'vr': '🥽',
  'virtual': '🥽',
  'experience': '🥽',
  'music': '🎵',
  'audio': '🎵',
  'documentary': '🎬',
  'film': '🎬',
  'gaming': '🎮',
  'game': '🎮',
  'technology': '💻',
  'tech': '💻',
  'lifestyle': '✨',
  'beauty': '✨',
  'education': '📚',
  'tutorial': '📚',
  'fitness': '💪',
  'sports': '⚽',
  'food': '🍳',
  'cooking': '🍳',
  'nature': '🌿',
  'comedy': '😂',
  'entertainment': '🎭',
  'news': '📰',
  'science': '🔬',
  'default': '📁',
};

function getCategoryIcon(category: CategoryApiItem): string {
  if (category.icon) return category.icon;

  // Try to match by slug
  const slug = category.slug.toLowerCase();
  for (const [key, icon] of Object.entries(defaultIcons)) {
    if (slug.includes(key)) return icon;
  }
  return defaultIcons.default;
}

export function CategorySection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.categories.getAll<{
          categories: CategoryApiItem[];
        }>();

        if (response.success && response.data?.categories && response.data.categories.length > 0) {
          // Filter out UUID-named categories (invalid entries)
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const validCategories = response.data.categories.filter(
            c => !uuidPattern.test(c.name) && !uuidPattern.test(c.slug)
          );

          const mappedCategories: Category[] = validCategories.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            icon: getCategoryIcon(c),
            count: c.count || 0,
          }));
          setCategories(mappedCategories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="py-8">
        <h2 className="font-display text-xl font-bold mb-4">Browse Categories</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  // Show max 10 categories (2 rows of 5) on large screens
  const displayedCategories = categories.slice(0, 10);
  const hasMore = categories.length > 10;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold">Browse Categories</h2>
        {hasMore && (
          <Link
            to="/categories"
            className="text-sm text-foreground hover:text-foreground/80 transition-colors font-medium"
          >
            View All ({categories.length})
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayedCategories.map((category, index) => (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className={cn(
              "group relative p-6 rounded-2xl bg-card border border-border/50",
              "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]",
              "transition-all duration-300 text-center",
              "animate-fadeIn"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl drop-shadow-md">{category.icon}</span>
              <div>
                <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {category.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {category.count.toLocaleString()} items
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
