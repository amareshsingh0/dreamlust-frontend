import { useState } from 'react';
import { TrendingUp, Globe, Sparkles, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { ContentCarousel } from '@/components/content/ContentCarousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockContent, mockCreators } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap } from 'lucide-react';

export default function Trending() {
  const trendingToday = [...mockContent].sort((a, b) => b.views - a.views);
  const editorsPicks = mockContent.filter(c => c.isPremium);
  const newCreators = mockCreators.filter(c => !c.isVerified);

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
                <ContentGrid content={trendingToday} columns={4} />
              </div>
            </TabsContent>

            <TabsContent value="week" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">🌍 Trending This Week</h2>
                <ContentGrid content={trendingToday.reverse()} columns={4} />
              </div>
            </TabsContent>

            <TabsContent value="picks" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">✨ Editor's Picks</h2>
                <ContentGrid content={editorsPicks.length > 0 ? editorsPicks : trendingToday.slice(0, 4)} columns={4} />
              </div>
            </TabsContent>

            <TabsContent value="creators" className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-bold mb-4">🚀 Rising Creators</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mockCreators.map((creator, index) => (
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
                          <span>{(creator.followers / 1000).toFixed(1)}K followers</span>
                          <span>{creator.contentCount} videos</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}
