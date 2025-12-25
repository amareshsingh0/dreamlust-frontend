import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Creator } from "@/types";

const Following = () => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchFollowing = async () => {
      try {
        setLoading(true);
        const response = await api.creators.getFollowing({ page, limit: 20 });

        if (response.success && response.data) {
          const data = response.data as { creators: any[] };
          // Map backend fields to frontend Creator type
          const creators: Creator[] = (data.creators || []).map((c: any) => ({
            id: c.id,
            name: c.displayName || c.handle || 'Unknown',
            username: c.handle || c.id,
            avatar: c.avatar || '',
            banner: c.banner,
            bio: c.bio || '',
            followers: c.followerCount || 0,
            views: 0,
            contentCount: c.contentCount || 0,
            isVerified: c.isVerified || false,
          }));
          setFollowing(prev => page === 1 ? creators : [...prev, ...creators]);
          setHasMore(creators.length === 20);
        } else {
          toast.error(response.error?.message || "Failed to load following");
        }
      } catch (error: any) {
        console.error("Error fetching following:", error);
        toast.error("Failed to load following");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [user, page]);

  const handleUnfollow = async (creatorId: string) => {
    try {
      const response = await api.creators.follow(creatorId);
      if (response.success) {
        setFollowing(prev => prev.filter(c => c.id !== creatorId));
        toast.success("Unfollowed creator");
      } else {
        toast.error(response.error?.message || "Failed to unfollow");
      }
    } catch (error: any) {
      console.error("Error unfollowing:", error);
      toast.error("Failed to unfollow");
    }
  };

  if (!user) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to view creators you're following
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
        <title>Following - PassionFantasia</title>
        <meta name="description" content="Creators you're following" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-display font-bold">Following</h1>
            </div>
            <p className="text-muted-foreground">
              Creators you're following
            </p>
          </div>

          {loading && page === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : following.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Not Following Anyone</h3>
                <p className="text-muted-foreground mb-4">
                  Start following creators to see their content
                </p>
                <Button asChild>
                  <Link to="/creators">Discover Creators</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {following.map((creator) => (
                  <Card key={creator.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={creator.avatar} alt={creator.name || creator.username ? `${creator.name || creator.username} avatar` : 'Creator avatar'} />
                          <AvatarFallback>{creator.name?.[0] || creator.username?.[0] || 'C'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{creator.name || creator.username}</CardTitle>
                            {creator.isVerified && (
                              <Badge variant="default" className="text-xs">✓</Badge>
                            )}
                          </div>
                          <CardDescription>@{creator.username}</CardDescription>
                          <p className="text-sm text-muted-foreground mt-1">
                            {creator.followers?.toLocaleString() || 0} followers
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={`/creator/${creator.username}`}>View Profile</Link>
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        onClick={() => handleUnfollow(creator.id)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
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

export default Following;
