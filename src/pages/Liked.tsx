import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Heart } from "lucide-react";
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

const Liked = () => {
  const { user } = useAuth();
  const [likedContent, setLikedContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchLiked = async () => {
      try {
        setLoading(true);
        const response = await api.content.getLiked({ page, limit: 20 });
        
        if (response.success && response.data) {
          const data = response.data as { content: Content[] };
          const content = data.content || [];
          setLikedContent(prev => page === 1 ? content : [...prev, ...content]);
          setHasMore(content.length === 20);
        } else {
          toast.error(response.error?.message || "Failed to load liked content");
        }
      } catch (error: any) {
        console.error("Error fetching liked content:", error);
        toast.error("Failed to load liked content");
      } finally {
        setLoading(false);
      }
    };

    fetchLiked();
  }, [user, page]);

  if (!user) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your liked content
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
        <title>Liked Content - PassionFantasia</title>
        <meta name="description" content="Your liked content" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-8 w-8 text-primary fill-primary" />
              <h1 className="text-4xl font-display font-bold">Liked Content</h1>
            </div>
            <p className="text-muted-foreground">
              Content you've liked and saved
            </p>
          </div>

          {loading && page === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : likedContent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Liked Content</h3>
                <p className="text-muted-foreground mb-4">
                  Start liking content to build your collection
                </p>
                <Button asChild>
                  <Link to="/explore">Explore Content</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {likedContent.length > 50 ? (
                <VirtualizedContentGrid 
                  content={likedContent} 
                  columns={4}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {likedContent.map((content) => (
                    <Suspense key={content.id} fallback={<ContentCardSkeleton />}>
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

export default Liked;
