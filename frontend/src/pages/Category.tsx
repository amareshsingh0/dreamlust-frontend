import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { ContentCard } from "@/components/content/ContentCard";
import { VirtualizedContentGrid } from "@/components/content/VirtualizedContentGrid";
import { Suspense } from 'react';
import { ContentCardSkeleton } from '@/components/content/ContentCardSkeleton';
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { mockCategories, mockContent } from "@/data/mockData";

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = mockCategories.find(c => c.slug === slug);
  const categoryContent = mockContent.filter(c => c.category === category?.name);

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-semibold mb-2">Category Not Found</h2>
              <p className="text-muted-foreground">The category you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{category.name} - Dreamlust</title>
        <meta name="description" content={`Browse ${category.name} content`} />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{category.icon}</span>
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
                content={categoryContent}
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

