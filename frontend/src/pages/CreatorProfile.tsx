import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Loader2,
  Send
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { TipModal } from '@/components/tips/TipModal';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Creator, Content } from '@/types';

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [creatorContent, setCreatorContent] = useState<Content[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!username) return;
      
      try {
        setLoading(true);
        // Get creator by handle/username
        const response = await api.creators.getByHandle(username);
        
        if (response.success && response.data) {
          const creatorData = response.data as any;
          setCreator({
            id: creatorData.id,
            name: creatorData.displayName || creatorData.handle,
            username: creatorData.handle,
            avatar: creatorData.avatar || '',
            banner: creatorData.banner || '',
            bio: creatorData.bio || '',
            isVerified: creatorData.isVerified || false,
            followers: creatorData.followerCount || 0,
            views: Number(creatorData.totalViews) || 0,
            contentCount: creatorData.contentCount || 0,
            socialLinks: creatorData.socialLinks || {},
          });
          setIsFollowing(creatorData.isFollowing === true);
        } else {
          toast.error("Creator not found");
        }
      } catch (error: any) {
        console.error("Error fetching creator:", error);
        toast.error("Failed to load creator profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [username]);

  // Fetch creator content
  useEffect(() => {
    const fetchCreatorContent = async () => {
      if (!creator?.id) return;

      try {
        setContentLoading(true);
        const response = await api.creators.getContent(creator.id, { limit: 50 });

        if (response.success && response.data) {
          const data = response.data as { content: Content[] };
          setCreatorContent(data.content || []);
        }
      } catch (error: any) {
        console.error("Error fetching creator content:", error);
      } finally {
        setContentLoading(false);
      }
    };

    fetchCreatorContent();
  }, [creator?.id]);

  // Fetch community posts
  useEffect(() => {
    const fetchCommunityPosts = async () => {
      if (!creator?.id) return;

      try {
        setCommunityLoading(true);
        const response = await api.community.getCreatorPosts(creator.id);

        if (response.success && response.data) {
          setCommunityPosts(response.data as any[]);
        }
      } catch (error: any) {
        console.error("Error fetching community posts:", error);
      } finally {
        setCommunityLoading(false);
      }
    };

    fetchCommunityPosts();
  }, [creator?.id]);

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please sign in to follow creators");
      navigate("/auth");
      return;
    }

    if (!creator) return;

    setFollowLoading(true);
    const previousFollowing = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      const response = await api.creators.follow(creator.id);
      if (response.success) {
        const responseData = response.data as { following?: boolean };
        const following = responseData?.following ?? !previousFollowing;
        setIsFollowing(following);
        setCreator(prev => prev ? {
          ...prev,
          followers: following 
            ? prev.followers + 1 
            : Math.max(0, prev.followers - 1)
        } : null);
      } else {
        // Revert on error
        setIsFollowing(previousFollowing);
        toast.error(response.error?.message || "Failed to follow creator");
      }
    } catch (error: any) {
      // Revert on error
      setIsFollowing(previousFollowing);
      toast.error("Failed to follow creator");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    if (!creator) return;

    const shareUrl = window.location.href;
    const shareText = `Check out ${creator.name} on PassionFantasia!`;
    const shareTitle = `${creator.name} - PassionFantasia`;

    // Try Web Share API first (mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
        return;
      } catch (error: any) {
        // User cancelled or error - fall through to clipboard
        if (error.name !== 'AbortError') {
          console.log('Share failed, falling back to clipboard');
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied to clipboard!');
    } catch (error) {
      // Final fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Profile link copied to clipboard!');
    }
  };

  // Handle community post like
  const handlePostLike = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to like posts");
      navigate("/auth");
      return;
    }

    const post = communityPosts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;

    // Optimistic update
    setCommunityPosts(posts => posts.map(p =>
      p.id === postId
        ? { ...p, isLiked: !wasLiked, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 }
        : p
    ));

    try {
      const response = wasLiked
        ? await api.community.unlikePost(postId)
        : await api.community.likePost(postId);

      if (!response.success) {
        // Revert on error
        setCommunityPosts(posts => posts.map(p =>
          p.id === postId
            ? { ...p, isLiked: wasLiked, likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1 }
            : p
        ));
        toast.error("Failed to update like");
      }
    } catch (error) {
      // Revert on error
      setCommunityPosts(posts => posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: wasLiked, likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1 }
          : p
      ));
      toast.error("Failed to update like");
    }
  };

  // Toggle comments section
  const toggleComments = async (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
      return;
    }

    setExpandedComments(postId);

    // Fetch comments if not already loaded
    if (!postComments[postId]) {
      try {
        const response = await api.community.getComments(postId);
        if (response.success && response.data) {
          setPostComments(prev => ({ ...prev, [postId]: response.data as any[] }));
        }
      } catch (error) {
        console.error("Failed to load comments:", error);
      }
    }
  };

  // Handle comment submit
  const handleCommentSubmit = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to comment");
      navigate("/auth");
      return;
    }

    const commentText = newComment[postId]?.trim();
    if (!commentText) return;

    setCommentLoading(postId);

    try {
      const response = await api.community.createComment(postId, { content: commentText });

      if (response.success && response.data) {
        // Add comment to local state
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), response.data]
        }));
        // Update comment count
        setCommunityPosts(posts => posts.map(p =>
          p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
        ));
        // Clear input
        setNewComment(prev => ({ ...prev, [postId]: '' }));
        toast.success("Comment added!");
      } else {
        toast.error("Failed to add comment");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(null);
    }
  };

  // Filter content by type
  const filteredContent = selectedContentType === 'all' 
    ? creatorContent 
    : creatorContent.filter(c => c.type.toLowerCase() === selectedContentType);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading creator profile...</p>
        </div>
      </Layout>
    );
  }

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


  return (
    <>
      <Helmet>
        <title>{creator.name} - PassionFantasia Creator</title>
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
                  <div className="h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-background shadow-xl bg-background">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={creator.avatar} alt={`${creator.name} avatar`} className="h-full w-full object-cover" />
                      <AvatarFallback className="h-full w-full text-2xl md:text-4xl flex items-center justify-center">{creator.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  {creator.isVerified && (
                    <div className="absolute bottom-[8px] right-[8px] w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-md">
                      <Zap className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary-foreground fill-primary-foreground" />
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

                  {/* Social Media Handles - Icons Only */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {/* Instagram */}
                    <a 
                      href={creator.socialLinks?.instagram 
                        ? `https://instagram.com/${creator.socialLinks.instagram}` 
                        : 'https://instagram.com'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary transition-all shadow-sm hover:shadow-md"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                    
                    {/* Twitter */}
                    <a 
                      href={creator.socialLinks?.twitter 
                        ? `https://twitter.com/${creator.socialLinks.twitter}` 
                        : 'https://twitter.com'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary transition-all shadow-sm hover:shadow-md"
                      aria-label="Twitter"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                    
                    {/* Facebook */}
                    <a 
                      href={creator.socialLinks?.facebook 
                        ? `https://facebook.com/${creator.socialLinks.facebook}` 
                        : 'https://facebook.com'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary transition-all shadow-sm hover:shadow-md"
                      aria-label="Facebook"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    
                    {/* Pinterest */}
                    <a 
                      href={creator.socialLinks?.pinterest 
                        ? `https://pinterest.com/${creator.socialLinks.pinterest}` 
                        : 'https://pinterest.com'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary transition-all shadow-sm hover:shadow-md"
                      aria-label="Pinterest"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                      </svg>
                    </a>
                    
                    {/* Website */}
                    <a 
                      href={creator.socialLinks?.website || '#'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary transition-all shadow-sm hover:shadow-md"
                      aria-label="Website"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
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
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isFollowing ? "Unfollowing..." : "Following..."}
                    </>
                  ) : isFollowing ? (
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
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setTipModalOpen(true)}
                >
                  <Heart className="h-4 w-4" />
                  Tip Creator
                </Button>
                <Button variant="secondary" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="content" className="mb-6">
                <TabsList>
                  <TabsTrigger value="content" className="gap-2">
                    <Video className="h-4 w-4" />
                    All Content
                  </TabsTrigger>
                  <TabsTrigger value="community" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Community
                  </TabsTrigger>
                  <TabsTrigger value="about" className="gap-2">
                    <FileText className="h-4 w-4" />
                    About
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-6">
                  {/* Content Type Filters */}
                  <div className="flex gap-2 mb-6 flex-wrap">
                    <Button
                      variant={selectedContentType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedContentType('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={selectedContentType === 'video' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedContentType('video')}
                    >
                      Videos
                    </Button>
                    <Button
                      variant={selectedContentType === 'vr' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedContentType('vr')}
                    >
                      VR
                    </Button>
                    <Button
                      variant={selectedContentType === 'photo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedContentType('photo')}
                    >
                      Photos
                    </Button>
                  </div>
                  
                  {/* Content Grid */}
                  {contentLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading content...</p>
                    </div>
                  ) : filteredContent.length === 0 ? (
                    <div className="text-center py-12">
                      <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No content yet</p>
                    </div>
                  ) : (
                    <ContentGrid content={filteredContent} columns={4} />
                  )}
                </TabsContent>

                <TabsContent value="community" className="mt-6">
                  {communityLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading community posts...</p>
                    </div>
                  ) : communityPosts.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No community posts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {communityPosts.map((post) => (
                        <div key={post.id} className="p-4 rounded-xl border bg-card">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={post.author?.avatar} alt={post.author?.name} />
                              <AvatarFallback>{post.author?.name?.[0] || 'C'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{post.author?.name}</span>
                                {post.author?.isVerified && (
                                  <Zap className="h-4 w-4 text-primary fill-primary" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="mt-2 text-foreground/90 whitespace-pre-wrap">{post.content}</p>
                              {post.image && (
                                <img
                                  src={post.image}
                                  alt="Post image"
                                  className="mt-3 rounded-lg max-h-96 object-cover w-full"
                                />
                              )}
                              <div className="flex items-center gap-4 mt-3">
                                <button
                                  onClick={() => handlePostLike(post.id)}
                                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <Heart className={cn("h-4 w-4", post.isLiked && "fill-current text-red-500")} />
                                  {post.likeCount || 0}
                                </button>
                                <button
                                  onClick={() => toggleComments(post.id)}
                                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  {post.commentCount || 0}
                                </button>
                              </div>

                              {/* Comments Section */}
                              {expandedComments === post.id && (
                                <div className="mt-4 pt-4 border-t space-y-3">
                                  {/* Comment Input */}
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Write a comment..."
                                      value={newComment[post.id] || ''}
                                      onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="icon"
                                      onClick={() => handleCommentSubmit(post.id)}
                                      disabled={!newComment[post.id]?.trim() || commentLoading === post.id}
                                    >
                                      {commentLoading === post.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>

                                  {/* Comments List */}
                                  <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {postComments[post.id]?.length === 0 ? (
                                      <p className="text-sm text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
                                    ) : (
                                      postComments[post.id]?.map((comment) => (
                                        <div key={comment.id} className="flex gap-2">
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.author?.avatar} alt={comment.author?.name} />
                                            <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 bg-muted rounded-lg p-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium">{comment.author?.name}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <p className="text-sm">{comment.content}</p>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="about" className="mt-6">
                  <div className="max-w-3xl">
                    <p className="text-foreground/80 leading-relaxed">
                      {creator.bio || 'No about information available.'}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </Layout>

      {/* Tip Modal */}
      {creator && (
        <TipModal
          open={tipModalOpen}
          onOpenChange={setTipModalOpen}
          creatorId={creator.id}
          creatorName={creator.name}
        />
      )}

    </>
  );
}
