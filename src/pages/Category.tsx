import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { ContentCard } from "@/components/content/ContentCard";
import { VirtualizedContentGrid } from "@/components/content/VirtualizedContentGrid";
import { Suspense, useEffect, useState } from 'react';
import { ContentCardSkeleton } from '@/components/content/ContentCardSkeleton';
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { api } from "@/lib/api";
import type { Content } from "@/types";
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

interface SearchResult {
  results: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [categoryContent, setCategoryContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      try {
        // First fetch all categories to find the one with matching slug
        const categoriesResponse = await api.categories.getAll<{ categories: CategoryData[] }>();

        if (!categoriesResponse.success || !categoriesResponse.data?.categories) {
          setError("Failed to load categories");
          setLoading(false);
          return;
        }

        const foundCategory = categoriesResponse.data.categories.find(
          (c: CategoryData) => c.slug === slug
        );

        if (!foundCategory) {
          setError("Category not found");
          setLoading(false);
          return;
        }

        setCategory(foundCategory);

        // Now fetch content for this category using search API
        const searchResponse = await api.search.post<SearchResult>({
          query: '',
          filters: {
            categories: [foundCategory.id],
          },
          sort: 'trending',
          page: 1,
          limit: 50,
        });

        if (searchResponse.success && searchResponse.data?.results) {
          setCategoryContent(searchResponse.data.results);
        } else {
          setCategoryContent([]);
        }
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError("Failed to load category content");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-semibold mb-2">Category Not Found</h2>
              <p className="text-muted-foreground">
                {error || "The category you're looking for doesn't exist."}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{category.name} - PassionFantasia</title>
        <meta name="description" content={`Browse ${category.name} content`} />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {category.icon && <span className="text-4xl">{category.icon}</span>}
              <h1 className="text-4xl font-display font-bold">{category.name}</h1>
            </div>
            <p className="text-muted-foreground">
              {categoryContent.length} items in this category
            </p>
          </div>

          {categoryContent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-xl font-semibold mb-2">No Content</h3>
                <p className="text-muted-foreground">
                  There's no content in this category yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <ContentCarousel
                title={`Popular in ${category.name}`}
                content={categoryContent.slice(0, 10)}
              />
              {categoryContent.length > 50 ? (
                <VirtualizedContentGrid
                  content={categoryContent}
                  columns={4}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categoryContent.map((content) => (
                    <Suspense key={content.id} fallback={<ContentCardSkeleton />}>
                      <ContentCard content={content} />
                    </Suspense>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Category;
