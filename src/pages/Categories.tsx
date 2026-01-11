import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  count: number;
}

// Default icons for categories without custom icons
const defaultIcons: Record<string, string> = {
  'art': '🎨',
  'design': '🎨',
  'adventure': '⛰️',
  'travel': '✈️',
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

function getCategoryIcon(category: CategoryData): string {
  if (category.icon) return category.icon;
  const slug = category.slug.toLowerCase();
  for (const [key, icon] of Object.entries(defaultIcons)) {
    if (slug.includes(key)) return icon;
  }
  return defaultIcons.default;
}

const Categories = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.categories.getAll<{ categories: CategoryData[] }>();
        if (response.success && response.data?.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <>
      <Helmet>
        <title>Categories - PassionFantasia</title>
        <meta name="description" content="Browse content by category" />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold mb-2">Categories</h1>
            <p className="text-muted-foreground">
              Explore content by category
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No categories available
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((category) => (
                <Link key={category.id} to={`/category/${category.slug}`}>
                  <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer h-full hover:border-primary/50">
                    <CardHeader className="text-center">
                      <div className="text-4xl mb-2">{getCategoryIcon(category)}</div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.count} items</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Categories;
