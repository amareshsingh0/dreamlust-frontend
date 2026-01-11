import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface CreatorApiItem {
  id: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
  followerCount?: number;
  _count?: { content: number };
}

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  followers: number;
}

export function TrendingCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const response = await api.creators.getAll<{
          creators: CreatorApiItem[];
        }>({ limit: 4 });

        if (response.success && response.data?.creators) {
          const mappedCreators: Creator[] = response.data.creators.map(c => ({
            id: c.id,
            name: c.displayName || c.handle,
            username: c.handle,
            avatar: c.avatar || '',
            isVerified: c.isVerified,
            followers: c.followerCount || 0,
          }));
          setCreators(mappedCreators);
        }
      } catch (error) {
        console.error('Failed to fetch creators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Trending Creators</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (creators.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Trending Creators</h2>
        <Link to="/creators" className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {creators.map((creator, index) => (
          <Link
            key={creator.id}
            to={`/creator/${creator.username}`}
            className={cn(
              "group p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/50",
              "hover:shadow-lg hover:shadow-primary/10 transition-all duration-300",
              "animate-fadeIn"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-primary/50 group-hover:border-primary transition-colors">
                  <AvatarImage src={creator.avatar} alt={`${creator.name} avatar`} />
                  <AvatarFallback>{creator.name[0]}</AvatarFallback>
                </Avatar>
                {creator.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Zap className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {creator.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  @{creator.username}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {creator.followers >= 1000
                      ? `${(creator.followers / 1000).toFixed(1)}K`
                      : creator.followers} followers
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
