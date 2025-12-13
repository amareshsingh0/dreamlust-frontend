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
  Bell,
  Heart,
  FileText,
  MessageCircle,
  Camera
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
    { label: 'Total Views', value: creator.views, icon: Eye },
    { label: 'Videos', value: creator.contentCount, icon: Video },
  ];

  return (
    <>
      <Helmet>
        <title>{creator.name} - DreamLust Creator</title>
        <meta name="description" content={creator.bio} />
      </Helmet>
      
      <Layout>
        <div className="w-full">
          {/* Banner with Gradient Background */}
          <div className="relative h-48 md:h-64 lg:h-80 w-full overflow-hidden">
            {creator.banner ? (
              <img
                src={creator.banner}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-pink-400 via-orange-300 to-blue-400" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>

          <div className="container mx-auto px-4 pb-8">
            {/* Profile Header Section - Overlapping Banner */}
            <div className="relative -mt-20 mb-8">
              {/* Profile Picture - Overlapping Banner */}
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={creator.avatar} />
                    <AvatarFallback className="text-2xl md:text-4xl">{creator.name[0]}</AvatarFallback>
                  </Avatar>
                  {creator.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-4 border-background">
                      <Zap className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Creator Info */}
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="font-display text-2xl md:text-3xl font-bold">{creator.name}</h1>
                    {creator.isVerified && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Verified Creator
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">@{creator.username}</p>
                  
                  {creator.bio && (
                    <p className="text-sm text-foreground/80 mb-3">{creator.bio}</p>
                  )}

                  {/* Social Media Handles */}
                  <div className="flex flex-wrap gap-3 text-sm mb-4">
                    {creator.socialLinks?.instagram ? (
                      <a 
                        href={`https://instagram.com/${creator.socialLinks.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Instagram className="h-4 w-4" />
                        <span>@{creator.socialLinks.instagram}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Instagram className="h-4 w-4" />
                        <span>Instagram</span>
                      </span>
                    )}
                    
                    {creator.socialLinks?.twitter ? (
                      <a 
                        href={`https://twitter.com/${creator.socialLinks.twitter}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Twitter className="h-4 w-4" />
                        <span>@{creator.socialLinks.twitter}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Twitter className="h-4 w-4" />
                        <span>Twitter</span>
                      </span>
                    )}
                    
                    <span className="text-muted-foreground flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                      <span>Facebook</span>
                    </span>
                    
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Camera className="h-4 w-4" />
                      <span>Snapchat</span>
                    </span>
                    
                    {creator.socialLinks?.website ? (
                      <a 
                        href={creator.socialLinks.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Globe className="h-4 w-4" />
                        <span>{creator.socialLinks.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        <span>Website</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold">
                      {creator.followers >= 1000000 
                        ? `${(creator.followers / 1000000).toFixed(1)}M`
                        : creator.followers >= 1000
                          ? `${(creator.followers / 1000).toFixed(1)}K`
                          : creator.followers.toLocaleString()
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold">
                      {creator.views >= 1000000 
                        ? `${(creator.views / 1000000).toFixed(1)}M`
                        : creator.views >= 1000
                          ? `${(creator.views / 1000).toFixed(1)}K`
                          : creator.views.toLocaleString()
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold">{creator.contentCount}</p>
                    <p className="text-xs text-muted-foreground">Videos</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
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
                <Button variant="outline" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Tip Creator
                </Button>
                <Button variant="secondary" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="videos" className="mb-6">
                <TabsList>
                  <TabsTrigger value="videos" className="gap-2">
                    <Video className="h-4 w-4" />
                    Videos
                  </TabsTrigger>
                  <TabsTrigger value="about" className="gap-2">
                    <FileText className="h-4 w-4" />
                    About
                  </TabsTrigger>
                  <TabsTrigger value="community" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Community
                  </TabsTrigger>
                  <TabsTrigger value="followers" className="gap-2">
                    <Users className="h-4 w-4" />
                    Followers ({creator.followers})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="videos" className="mt-6">
                  {/* Content Grid */}
                  <ContentGrid content={creatorContent} columns={4} />
                </TabsContent>

                <TabsContent value="about" className="mt-6">
                  <div className="max-w-3xl">
                    <p className="text-foreground/80 leading-relaxed">
                      {creator.bio || 'No about information available.'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="community" className="mt-6">
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Community posts coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="followers" className="mt-6">
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Followers list coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
