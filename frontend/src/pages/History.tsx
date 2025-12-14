import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Clock, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/content/ContentCard";
import { VirtualizedContentGrid } from "@/components/content/VirtualizedContentGrid";
import { Suspense } from 'react';
import { ContentCardSkeleton } from '@/components/content/ContentCardSkeleton';
import { mockContent } from "@/data/mockData";

const History = () => {
  // Mock watch history (in real app, fetch from Supabase)
  const watchHistory = mockContent.slice(0, 12);

  return (
    <>
      <Helmet>
        <title>Watch History - Dreamlust</title>
        <meta name="description" content="Your watch history" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-display font-bold">Watch History</h1>
              </div>
              <p className="text-muted-foreground">
                Continue watching from where you left off
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>

          {watchHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Watch History</h3>
                <p className="text-muted-foreground mb-4">
                  Start watching content to build your history
                </p>
                <Button asChild>
                  <Link to="/explore">Explore Content</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            watchHistory.length > 50 ? (
              <VirtualizedContentGrid 
                content={watchHistory} 
                columns={4}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {watchHistory.map((content) => (
                  <Suspense key={content.id} fallback={<ContentCardSkeleton />}>
                    <ContentCard content={content} />
                  </Suspense>
                ))}
              </div>
            )
          )}
        </div>
      </Layout>
    </>
  );
};

export default History;

