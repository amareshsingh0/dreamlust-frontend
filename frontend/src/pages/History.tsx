import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Clock, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/content/ContentCard";
import { VirtualizedContentGrid } from "@/components/content/VirtualizedContentGrid";
import { Suspense, useEffect, useState } from 'react';
import { ContentCardSkeleton } from '@/components/content/ContentCardSkeleton';
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Content } from "@/types";

const History = () => {
  const { user } = useAuth();
  const [watchHistory, setWatchHistory] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await api.content.getHistory({ page, limit: 20 });
        
        if (response.success && response.data) {
          const data = response.data as { content: Content[] };
          const content = data.content || [];
          setWatchHistory(prev => page === 1 ? content : [...prev, ...content]);
          setHasMore(content.length === 20);
        } else {
          toast.error(response.error?.message || "Failed to load watch history");
        }
      } catch (error: any) {
        console.error("Error fetching watch history:", error);
        toast.error("Failed to load watch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, page]);

  if (!user) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your watch history
            </p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Watch History - PassionFantasia</title>
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

          {loading && page === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : watchHistory.length === 0 ? (
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
            <>
              {watchHistory.length > 50 ? (
                <VirtualizedContentGrid 
                  content={watchHistory} 
                  columns={4}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {watchHistory.map((content, index) => (
                    <Suspense key={`${content.id}-${index}`} fallback={<ContentCardSkeleton />}>
                      <ContentCard content={content} />
                    </Suspense>
                  ))}
                </div>
              )}
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={loading}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
};

export default History;
