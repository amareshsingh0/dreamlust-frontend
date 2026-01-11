import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { CreatorCardSkeleton } from "@/components/creator/CreatorCardSkeleton";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Creator } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Creators = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchCreators();
  }, [page]);

  const fetchCreators = async () => {
    try {
      setIsLoading(true);
      const response = await api.creators.getAll<{
        creators: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>({ page, limit: 20 });

      if (response.success && response.data) {
        const data = response.data as { creators: any[]; pagination: { page: number; limit: number; total: number; pages: number } };
        const creatorData = data.creators.map((c: any) => ({
          id: c.id,
          name: c.displayName || c.handle,
          username: c.handle,
          avatar: c.avatar || '',
          banner: c.banner || '',
          bio: c.bio || '',
          isVerified: c.isVerified || false,
          followers: c.followerCount || 0,
          views: Number(c.totalViews) || 0,
          contentCount: c.contentCount || 0,
          socialLinks: {},
        }));

        if (page === 1) {
          setCreators(creatorData);
        } else {
          setCreators(prev => [...prev, ...creatorData]);
        }

        // Update following status
        const followingSet = new Set<string>();
        data.creators.forEach((c: any) => {
          if (c.isFollowing) {
            followingSet.add(c.id);
          }
        });
        setFollowing(prev => new Set([...prev, ...followingSet]));

        setHasMore(page < data.pagination.pages);
      } else {
        toast.error(response.error?.message || "Failed to load creators");
      }
    } catch (error: any) {
      console.error("Error fetching creators:", error);
      toast.error("Failed to load creators");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (creatorId: string) => {
    if (!user) {
      toast.error("Please sign in to follow creators");
      return;
    }

    const previousFollowing = following.has(creatorId);
    const nextFollowing = new Set(following);
    
    if (previousFollowing) {
      nextFollowing.delete(creatorId);
    } else {
      nextFollowing.add(creatorId);
    }
    setFollowing(nextFollowing);

    try {
      const response = await api.creators.follow(creatorId);
      if (response.success) {
        const responseData = response.data as { following?: boolean };
        const isNowFollowing = responseData?.following ?? !previousFollowing;
        
        if (isNowFollowing) {
          setFollowing(prev => new Set([...prev, creatorId]));
        } else {
          setFollowing(prev => {
            const next = new Set(prev);
            next.delete(creatorId);
            return next;
          });
        }
      } else {
        // Revert on error
        setFollowing(prev => {
          const next = new Set(prev);
          if (previousFollowing) {
            next.add(creatorId);
          } else {
            next.delete(creatorId);
          }
          return next;
        });
        toast.error(response.error?.message || "Failed to follow creator");
      }
    } catch (error: any) {
      // Revert on error
      setFollowing(prev => {
        const next = new Set(prev);
        if (previousFollowing) {
          next.add(creatorId);
        } else {
          next.delete(creatorId);
        }
        return next;
      });
      toast.error("Failed to follow creator");
    }
  };

  return (
    <>
      <Helmet>
        <title>Creators - PassionFantasia</title>
        <meta name="description" content="Discover talented creators on PassionFantasia. Follow your favorites and explore their content." />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Header */}
          <div className="mb-10 lg:mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-3 text-foreground">
              Discover Creators
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mx-auto max-w-2xl">
              Follow your favorite creators and never miss their latest content.
            </p>
          </div>

          {/* Creators Grid */}
          {isLoading && creators.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              <CreatorCardSkeleton count={8} />
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">No creators found</p>
              <p className="text-muted-foreground text-sm">
                Be the first to become a creator!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                {creators.map((creator, index) => (
                  <div
                    key={creator.id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CreatorCard
                      creator={creator}
                      showFollowButton={!!user}
                      isFollowing={following.has(creator.id)}
                      onFollow={handleFollow}
                    />
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={isLoading}
                    className="px-6 py-2 rounded-lg border-2 border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Creators;
