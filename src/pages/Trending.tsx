import { useState, useEffect } from 'react';
import { TrendingUp, Globe, Sparkles, Users, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap } from 'lucide-react';
import { api } from '@/lib/api';
import type { Content, Creator } from '@/types';

// API returns data directly as an array

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

interface CreatorsResponse {
  creators: CreatorApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function Trending() {
  const [trendingToday, setTrendingToday] = useState<Content[]>([]);
  const [trendingWeek, setTrendingWeek] = useState<Content[]>([]);
  const [editorsPicks, setEditorsPicks] = useState<Content[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingPicks, setLoadingPicks] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);

  // Fetch trending today
  useEffect(() => {
    const fetchTrendingToday = async () => {
      try {
        const response = await api.recommendations.getTrendingNow<Content[]>(50);
        if (response.success && response.data) {
          // Data is returned directly as an array
          setTrendingToday(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Failed to fetch trending today:', error);
      } finally {
        setLoadingToday(false);
      }
    };
    fetchTrendingToday();
  }, []);

  // Fetch trending this week (using search with views sort)
  useEffect(() => {
    const fetchTrendingWeek = async () => {
      try {
        const response = await api.search.post<{
          results: Content[];
        }>({
          query: '',
          sort: 'views',
          limit: 50,
        });
        if (response.success && response.data?.results) {
          setTrendingWeek(response.data.results);
        }
      } catch (error) {
        console.error('Failed to fetch trending week:', error);
      } finally {
        setLoadingWeek(false);
      }
    };
    fetchTrendingWeek();
  }, []);

  // Fetch editor's picks (top rated content)
  useEffect(() => {
    const fetchEditorsPicks = async () => {
      try {
        const response = await api.search.post<{
          results: Content[];
        }>({
          query: '',
          sort: 'rating',
          limit: 20,
        });
        if (response.success && response.data?.results) {
          setEditorsPicks(response.data.results);
        }
      } catch (error) {
        console.error('Failed to fetch editors picks:', error);
      } finally {
        setLoadingPicks(false);
      }
    };
    fetchEditorsPicks();
  }, []);

  // Fetch creators
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const response = await api.creators.getAll<CreatorsResponse>({ limit: 12 });
        if (response.success && response.data?.creators) {
          const mappedCreators: Creator[] = response.data.creators.map(c => ({
            id: c.id,
            name: c.displayName || c.handle,
            username: c.handle,
            avatar: c.avatar || '',
            bio: c.bio || '',
            followers: c.followerCount || 0,
            views: 0,
            contentCount: c._count?.content || 0,
            isVerified: c.isVerified,
          }));
          setCreators(mappedCreators);
        }
      } catch (error) {
        console.error('Failed to fetch creators:', error);
      } finally {
        setLoadingCreators(false);
      }
    };
    fetchCreators();
  }, []);

  return (
    <>
      <Helmet>
        <title>Trending - PassionFantasia</title>
        <meta name="description" content="Discover what's trending on PassionFantasia. See the most popular content and rising creators." />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Trending
            </h1>
            <p className="text-muted-foreground">Discover what's hot right now</p>
          </div>

          <Tabs defaultValue="today" className="space-y-8">
            <TabsList>
              <TabsTrigger value="today" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <Globe className="h-4 w-4" />
                This Week
              </TabsTrigger>
              <TabsTrigger value="picks" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Editor's Picks
              </TabsTrigger>
              <TabsTrigger value="creators" className="gap-2">
                <Users className="h-4 w-4" />
                Rising Creators
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">🔥 Trending Today</h2>
                {loadingToday ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : trendingToday.length > 0 ? (
                  <ContentGrid content={trendingToday} columns={4} />
                ) : (
                  <p className="text-center text-muted-foreground py-10">No trending content available.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="week" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">🌍 Trending This Week</h2>
                {loadingWeek ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : trendingWeek.length > 0 ? (
                  <ContentGrid content={trendingWeek} columns={4} />
                ) : (
                  <p className="text-center text-muted-foreground py-10">No trending content available.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="picks" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">✨ Editor's Picks</h2>
                {loadingPicks ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : editorsPicks.length > 0 ? (
                  <ContentGrid content={editorsPicks} columns={4} />
                ) : trendingToday.length > 0 ? (
                  <ContentGrid content={trendingToday.slice(0, 8)} columns={4} />
                ) : (
                  <p className="text-center text-muted-foreground py-10">No picks available.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="creators" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">🚀 Rising Creators</h2>
                {loadingCreators ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : creators.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {creators.map((creator, index) => (
                      <Link
                        key={creator.id}
                        to={`/creator/${creator.username}`}
                        className="group p-6 rounded-xl bg-card/50 border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-4">
                            <Avatar className="h-20 w-20 border-2 border-primary/50 group-hover:border-primary transition-colors">
                              <AvatarImage src={creator.avatar} alt={`${creator.name} avatar`} />
                              <AvatarFallback>{creator.name[0]}</AvatarFallback>
                            </Avatar>
                            {creator.isVerified && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <Zap className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>

                          <h3 className="font-medium group-hover:text-primary transition-colors">
                            {creator.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            @{creator.username}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {creator.bio}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{creator.followers >= 1000 ? `${(creator.followers / 1000).toFixed(1)}K` : creator.followers} followers</span>
                            <span>{creator.contentCount} videos</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-10">No creators available.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}
