import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Zap, 
  Users, 
  Eye, 
  Video, 
  Twitter, 
  Instagram, 
  Globe,
  Share2,
  Bell
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockCreators, mockContent } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const [isFollowing, setIsFollowing] = useState(false);
  
  const creator = mockCreators.find(c => c.username === username);
  const creatorContent = mockContent.filter(c => c.creator.username === username);

  if (!creator) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Creator not found</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const stats = [
    { label: 'Followers', value: creator.followers, icon: Users },
    { label: 'Views', value: creator.views, icon: Eye },
    { label: 'Content', value: creator.contentCount, icon: Video },
  ];

  return (
    <>
      <Helmet>
        <title>{creator.name} - DreamLust Creator</title>
        <meta name="description" content={creator.bio} />
      </Helmet>
      
      <Layout>
        {/* Banner */}
        <div className="relative h-48 md:h-64 lg:h-80">
          <img
            src={creator.banner || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200'}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container mx-auto px-4">
          {/* Profile Header */}
          <div className="relative -mt-20 mb-8">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                  <AvatarImage src={creator.avatar} />
                  <AvatarFallback className="text-4xl">{creator.name[0]}</AvatarFallback>
                </Avatar>
                {creator.isVerified && (
                  <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl font-bold">{creator.name}</h1>
                  {creator.isVerified && (
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      Verified Creator
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">@{creator.username}</p>
                <p className="text-foreground/80 max-w-2xl mb-4">{creator.bio}</p>

                {/* Social Links */}
                {creator.socialLinks && (
                  <div className="flex gap-2 mb-4">
                    {creator.socialLinks.twitter && (
                      <Button variant="secondary" size="icon" asChild>
                        <a href={`https://twitter.com/${creator.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {creator.socialLinks.instagram && (
                      <Button variant="secondary" size="icon" asChild>
                        <a href={`https://instagram.com/${creator.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {creator.socialLinks.website && (
                      <Button variant="secondary" size="icon" asChild>
                        <a href={creator.socialLinks.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className={cn(
                    "gap-2",
                    isFollowing 
                      ? "bg-secondary text-secondary-foreground" 
                      : "bg-gradient-to-r from-primary to-accent"
                  )}
                  onClick={() => setIsFollowing(!isFollowing)}
                >
                  {isFollowing ? (
                    <>
                      <Bell className="h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6 py-4 border-y border-border/50">
              {stats.map(stat => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold">
                      {stat.value >= 1000000 
                        ? `${(stat.value / 1000000).toFixed(1)}M`
                        : stat.value >= 1000
                          ? `${(stat.value / 1000).toFixed(1)}K`
                          : stat.value
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="all" className="pb-12">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Content</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="vr">VR</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ContentGrid content={creatorContent} columns={4} />
            </TabsContent>
            <TabsContent value="videos">
              <ContentGrid content={creatorContent.filter(c => c.type === 'video')} columns={4} />
            </TabsContent>
            <TabsContent value="photos">
              <ContentGrid content={creatorContent.filter(c => c.type === 'photo' || c.type === 'gallery')} columns={4} />
            </TabsContent>
            <TabsContent value="vr">
              <ContentGrid content={creatorContent.filter(c => c.type === 'vr')} columns={4} />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}
