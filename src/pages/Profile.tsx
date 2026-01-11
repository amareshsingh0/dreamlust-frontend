import { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Heart,
  PlaySquare,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Globe,
  Trash2,
  Pin,
  Activity,
  Users,
  Plus,
  Edit,
  MoreVertical,
  Pause,
  Play,
  SortAsc,
  SortDesc,
  Calendar,
  Check
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { mockContent } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Camera, Upload, Video } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Content } from '@/types';

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Profile() {
  const { user, refreshUser, isCreator, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [hideHistory, setHideHistory] = useState(false);
  const [historyPaused, setHistoryPaused] = useState(false);
  const [likedSort, setLikedSort] = useState<'recent' | 'views' | 'oldest'>('recent');
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit profile state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editPinterest, setEditPinterest] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Initialize edit form when dialog opens
  useEffect(() => {
    if (editProfileOpen && user) {
      setEditDisplayName(user.displayName || '');
      setEditUsername(user.username || '');
      setEditBio(user.bio || '');
      const links = user.socialLinks as Record<string, string> | null;
      setEditTwitter(links?.twitter || '');
      setEditInstagram(links?.instagram || '');
      setEditFacebook(links?.facebook || '');
      setEditPinterest(links?.pinterest || '');
      setEditWebsite(links?.website || user.website || '');
      setAvatarPreview(null);
    }
  }, [editProfileOpen, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      // Store the file for upload
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      // Update avatar if a new file was selected
      if (avatarFile) {
        const avatarResponse = await api.upload.avatar<{ avatar: string; user: any }>(avatarFile);
        if (!avatarResponse.success) {
          toast.error(avatarResponse.error?.message || 'Failed to update avatar');
        }
      }

      // Build social links object
      const socialLinks: Record<string, string> = {};
      if (editTwitter.trim()) socialLinks.twitter = editTwitter.trim();
      if (editInstagram.trim()) socialLinks.instagram = editInstagram.trim();
      if (editFacebook.trim()) socialLinks.facebook = editFacebook.trim();
      if (editPinterest.trim()) socialLinks.pinterest = editPinterest.trim();
      if (editWebsite.trim()) socialLinks.website = editWebsite.trim();

      // Update profile info
      const response = await api.auth.updateProfile<{ user: any }>({
        displayName: editDisplayName,
        username: editUsername,
        bio: editBio,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      });

      if (response.success) {
        await refreshUser();
        toast.success('Profile updated successfully!');
        setEditProfileOpen(false);
        setAvatarPreview(null);
        setAvatarFile(null);
      } else {
        toast.error(response.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Notification preferences - to be implemented (prefixed with _ to suppress unused warning)
  const [_notificationPrefs] = useState({
    email: true,
    push: true,
    inApp: true,
    newUploads: true,
    creatorUpdates: true,
    recommendations: false,
  });

  // Real data states
  const [watchHistory, setWatchHistory] = useState<Content[]>([]);
  const [likedContent, setLikedContent] = useState<Content[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [followedCreators, setFollowedCreators] = useState<Array<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  }>>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string;
    type: string;
    content?: Content;
    creator?: { id: string; name: string; username: string; avatar: string };
    playlistName?: string;
    timestamp: string;
    text?: string;
  }>>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Get pinned content from liked content (top 3 favorites)
  const pinnedContent = likedContent.slice(0, 3);

  // Fetch watch history
  useEffect(() => {
    const fetchHistory = async () => {
      if (activeTab !== 'history' || hideHistory) return;
      setLoadingHistory(true);
      try {
        const response = await api.content.getHistory<{
          content: Content[];
          pagination: { page: number; limit: number; total: number; pages: number };
        }>();
        if (response.success && response.data) {
          setWatchHistory(response.data.content || []);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [activeTab, hideHistory]);

  // Fetch liked content (for overview pinned and liked tab)
  useEffect(() => {
    const fetchLiked = async () => {
      if (activeTab !== 'liked' && activeTab !== 'overview') return;
      if (likedContent.length > 0 && activeTab === 'overview') return; // Already fetched
      setLoadingLiked(true);
      try {
        const response = await api.content.getLiked<{
          content: Content[];
          pagination: { page: number; limit: number; total: number; pages: number };
        }>();
        if (response.success && response.data) {
          setLikedContent(response.data.content || []);
        }
      } catch (error) {
        console.error('Failed to fetch liked content:', error);
      } finally {
        setLoadingLiked(false);
      }
    };
    fetchLiked();
  }, [activeTab]);

  // Fetch followed creators for overview
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user?.id) return;
      setLoadingFollowing(true);
      try {
        const response = await api.social.getFollowing<Array<{
          id: string;
          followingId: string;
          following: {
            id: string;
            displayName: string | null;
            username: string;
            avatar: string | null;
            creator?: { isVerified: boolean };
          };
        }>>(user.id, 6, 0);
        if (response.success && response.data) {
          const mapped = response.data.map(f => ({
            id: f.following.id,
            name: f.following.displayName || f.following.username,
            username: f.following.username,
            avatar: f.following.avatar || '',
            isVerified: f.following.creator?.isVerified || false,
          }));
          setFollowedCreators(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch following:', error);
      } finally {
        setLoadingFollowing(false);
      }
    };
    fetchFollowing();
  }, [user?.id]);

  // Fetch activity feed for overview
  useEffect(() => {
    const fetchActivity = async () => {
      if (activeTab !== 'overview') return;
      setLoadingActivity(true);
      try {
        const response = await api.social.getActivityFeed<Array<{
          id: string;
          type: string;
          text: string;
          content?: any;
          targetUser?: any;
          createdAt: string;
        }>>(undefined, 10, 0);
        if (response.success && response.data) {
          const mapped = response.data.map(a => ({
            id: a.id,
            type: a.type,
            content: a.content,
            creator: a.targetUser ? {
              id: a.targetUser.id,
              name: a.targetUser.displayName || a.targetUser.username,
              username: a.targetUser.username,
              avatar: a.targetUser.avatar || '',
            } : undefined,
            timestamp: formatRelativeTime(a.createdAt),
            text: a.text,
          }));
          setActivityFeed(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch activity feed:', error);
      } finally {
        setLoadingActivity(false);
      }
    };
    fetchActivity();
  }, [activeTab]);

  // Group history by date (use watchedAt from API or fall back to createdAt)
  const groupedHistory = watchHistory.reduce((acc, item) => {
    const timestamp = (item as any).watchedAt || item.createdAt;
    const date = new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, typeof watchHistory>);

  const [playlists, setPlaylists] = useState<Array<{
    id: string;
    name: string;
    itemCount: number;
    isPublic: boolean;
    thumbnail?: string;
  }>>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [editPlaylistIsPublic, setEditPlaylistIsPublic] = useState(false);

  // Fetch playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoadingPlaylists(true);
      try {
        const response = await api.playlists.get<Array<{
          id: string;
          name: string;
          itemCount: number;
          isPublic: boolean;
          thumbnail?: string;
        }>>();
        if (response.success && response.data) {
          setPlaylists(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
        // Fallback to mock data on error
        setPlaylists([
          { id: '1', name: 'Favorites', itemCount: 12, isPublic: false, thumbnail: mockContent[0]?.thumbnail },
          { id: '2', name: 'Watch Later', itemCount: 8, isPublic: true, thumbnail: mockContent[1]?.thumbnail },
          { id: '3', name: 'Best of 2024', itemCount: 15, isPublic: false, thumbnail: mockContent[2]?.thumbnail },
        ]);
      } finally {
        setLoadingPlaylists(false);
      }
    };
    fetchPlaylists();
  }, []);

  // My Uploads state
  const [myUploads, setMyUploads] = useState<Content[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // Fetch uploaded content for creators
  useEffect(() => {
    let isMounted = true;

    const fetchMyUploads = async () => {
      // Use isCreator from auth context
      if (!isCreator || !user?.username) return;

      setLoadingUploads(true);
      try {
        // Get creator profile to get creator ID
        const creatorResponse = await api.creators.getByHandle(user.username);
        if (creatorResponse.success && creatorResponse.data && isMounted) {
          const creatorData = creatorResponse.data as any;
          const contentResponse = await api.creators.getContent(creatorData.id, { limit: 50 });
          if (contentResponse.success && contentResponse.data && isMounted) {
            const content = (contentResponse.data as any).content || [];
            // Deduplicate content by ID to prevent any duplicate entries
            const uniqueContent = content.filter(
              (item: Content, index: number, self: Content[]) =>
                index === self.findIndex((c) => c.id === item.id)
            );
            setMyUploads(uniqueContent);
          }
        }
      } catch (error) {
        console.error('Failed to fetch uploads:', error);
      } finally {
        if (isMounted) {
          setLoadingUploads(false);
        }
      }
    };
    fetchMyUploads();

    return () => {
      isMounted = false;
    };
  }, [isCreator, user?.username]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const response = await api.playlists.post<{
        id: string;
        name: string;
        itemCount: number;
        isPublic: boolean;
        thumbnail?: string;
      }>({
        name: newPlaylistName,
        isPublic: newPlaylistIsPublic,
      });
      if (response.success && response.data) {
        setPlaylists([...playlists, response.data]);
        setCreatePlaylistOpen(false);
        setNewPlaylistName('');
        setNewPlaylistIsPublic(false);
      }
    } catch (error: any) {
      console.error('Failed to create playlist:', error);
    }
  };

  const handleEditPlaylist = (playlist: typeof playlists[0]) => {
    setEditingPlaylist(playlist.id);
    setEditPlaylistName(playlist.name);
    setEditPlaylistIsPublic(playlist.isPublic);
  };

  const handleSaveEdit = async () => {
    if (!editingPlaylist || !editPlaylistName.trim()) return;
    try {
      const response = await api.playlists.put<{
        id: string;
        name: string;
        itemCount: number;
        isPublic: boolean;
        thumbnail?: string;
      }>(editingPlaylist, {
        name: editPlaylistName,
        isPublic: editPlaylistIsPublic,
      });
      if (response.success && response.data) {
        setPlaylists(playlists.map(p => p.id === editingPlaylist ? response.data! : p));
        setEditingPlaylist(null);
        setEditPlaylistName('');
        setEditPlaylistIsPublic(false);
      }
    } catch (error: any) {
      console.error('Failed to update playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      const response = await api.playlists.delete(playlistId);
      if (response.success) {
        setPlaylists(playlists.filter(p => p.id !== playlistId));
      }
    } catch (error: any) {
      console.error('Failed to delete playlist:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      const response = await api.content.clearHistory();
      if (response.success) {
        setWatchHistory([]);
      }
    } catch (error: any) {
      console.error('Failed to clear history:', error);
    }
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Profile - PassionFantasia</title>
        <meta name="description" content="Manage your PassionFantasia profile, watch history, and preferences." />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
          {/* Profile Header */}
          <ProfileHeader
            isOwnProfile={true}
            isCreator={isCreator}
            username={user?.username || 'user'}
            displayName={user?.displayName || user?.username || 'User'}
            avatar={user?.avatar}
            banner={user?.creator?.banner}
            bio={user?.bio || 'No bio yet'}
            socialLinks={user?.socialLinks as { twitter?: string; instagram?: string; facebook?: string; pinterest?: string; website?: string } | undefined}
            stats={{
              following: user?.followingCount || 0,
              watched: watchHistory.length,
              playlists: playlists.length,
            }}
            memberSince={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
            onEdit={() => setEditProfileOpen(true)}
          />

          {/* Edit Profile Dialog */}
          <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-hide">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Update your profile information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage
                        src={avatarPreview || user?.avatar}
                        alt={user?.displayName || 'User'}
                      />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  {avatarPreview && (
                    <Button variant="ghost" size="sm" onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}>
                      Remove new image
                    </Button>
                  )}
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-displayName">Display Name</Label>
                  <Input
                    id="edit-displayName"
                    name="displayName"
                    placeholder="Your display name"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    name="username"
                    placeholder="your_username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your unique username for your profile URL
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Textarea
                    id="edit-bio"
                    name="bio"
                    placeholder="Tell us about yourself..."
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <Label>Social Links</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-8 text-center">𝕏</span>
                      <Input
                        placeholder="enter your x username"
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-8 text-center">📷</span>
                      <Input
                        placeholder="enter your instagram username"
                        value={editInstagram}
                        onChange={(e) => setEditInstagram(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-8 text-center">📘</span>
                      <Input
                        placeholder="enter your facebook username"
                        value={editFacebook}
                        onChange={(e) => setEditFacebook(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-8 text-center">📌</span>
                      <Input
                        placeholder="enter your pinterest username"
                        value={editPinterest}
                        onChange={(e) => setEditPinterest(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 flex justify-center">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        placeholder="https://yourwebsite.com"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditProfileOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className={cn(
              "grid w-full max-w-2xl h-auto gap-0.5 sm:gap-1",
              isCreator ? "grid-cols-6" : "grid-cols-5"
            )}>
              <TabsTrigger value="overview" className="gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
                <Activity className="h-4 w-4" />
                <span className="hidden xs:inline">Overview</span>
              </TabsTrigger>
              {isCreator && (
                <TabsTrigger value="uploads" className="gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
                  <Upload className="h-4 w-4" />
                  <span className="hidden xs:inline">Uploads</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="playlists" className="gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
                <PlaySquare className="h-4 w-4" />
                <span className="hidden xs:inline">Lists</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
                <Clock className="h-4 w-4" />
                <span className="hidden xs:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="liked" className="gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
                <Heart className="h-4 w-4" />
                <span className="hidden xs:inline">Liked</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden xs:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Pinned Content */}
              {pinnedContent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Pin className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl font-bold">Pinned Content</h2>
                  </div>
                  <ContentGrid content={pinnedContent} columns={3} />
                </div>
              )}

              {/* Recent Activity Feed */}
              <div>
                <h2 className="font-display text-xl font-bold mb-4">Recent Activity</h2>
                {loadingActivity ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : activityFeed.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center">
                      <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No recent activity yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">Start watching and liking content to see your activity here!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {activityFeed.map((activity) => (
                      <Card key={activity.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {(activity.type === 'liked' || activity.type === 'LIKE') && activity.content && (
                              <>
                                <img
                                  src={activity.content.thumbnail}
                                  alt={activity.content.title}
                                  className="w-16 h-10 object-cover rounded"
                                />
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <Heart className="inline h-4 w-4 mr-1 text-primary fill-primary" />
                                    Liked <Link to={`/watch/${activity.content.id}`} className="font-medium hover:text-primary">{activity.content.title}</Link>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                                </div>
                              </>
                            )}
                            {(activity.type === 'watched' || activity.type === 'VIEW') && activity.content && (
                              <>
                                <img
                                  src={activity.content.thumbnail}
                                  alt={activity.content.title}
                                  className="w-16 h-10 object-cover rounded"
                                />
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <Eye className="inline h-4 w-4 mr-1" />
                                    Watched <Link to={`/watch/${activity.content.id}`} className="font-medium hover:text-primary">{activity.content.title}</Link>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                                </div>
                              </>
                            )}
                            {(activity.type === 'followed' || activity.type === 'FOLLOW') && activity.creator && (
                              <>
                                <Avatar className="w-10 h-10">
                                  <AvatarImage
                                    src={activity.creator.avatar}
                                    alt={activity.creator.name}
                                    width={40}
                                    height={40}
                                  />
                                  <AvatarFallback>{activity.creator.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <Users className="inline h-4 w-4 mr-1" />
                                    Started following <Link to={`/creator/${activity.creator.username}`} className="font-medium hover:text-primary">{activity.creator.name}</Link>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                                </div>
                              </>
                            )}
                            {(activity.type === 'created_playlist' || activity.type === 'PLAYLIST_CREATE') && (
                              <>
                                <PlaySquare className="h-10 w-10 text-primary" />
                                <div className="flex-1">
                                  <p className="text-sm">
                                    Created playlist <span className="font-medium">{activity.playlistName || 'New Playlist'}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                                </div>
                              </>
                            )}
                            {/* Generic activity with text for other types */}
                            {!['liked', 'LIKE', 'watched', 'VIEW', 'followed', 'FOLLOW', 'created_playlist', 'PLAYLIST_CREATE'].includes(activity.type) && activity.text && (
                              <>
                                <Activity className="h-10 w-10 text-primary" />
                                <div className="flex-1">
                                  <p className="text-sm">{activity.text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Followed Creators */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold">Followed Creators</h2>
                  <Link to="/following" className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
                    View All
                  </Link>
                </div>
                {loadingFollowing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : followedCreators.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">You're not following any creators yet.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/explore">Discover Creators</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {followedCreators.map((creator) => (
                      <Link key={creator.id} to={`/creator/${creator.username}`}>
                        <Card className="hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer group">
                          <CardContent className="p-4 flex flex-col items-center text-center">
                            <Avatar className="h-16 w-16 mb-3 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                              <AvatarImage src={creator.avatar} alt={creator.name} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                                {creator.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                              {creator.name}
                            </div>
                            {creator.isVerified && (
                              <Badge variant="default" className="mt-1 text-xs px-1.5 py-0">
                                <Check className="h-3 w-3 mr-0.5" />
                                Verified
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Uploads Tab - Only for creators */}
            {isCreator && (
              <TabsContent value="uploads">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-bold">My Uploads</h2>
                  <Button asChild className="gap-2">
                    <Link to="/upload">
                      <Upload className="h-4 w-4" />
                      New Upload
                    </Link>
                  </Button>
                </div>

                {loadingUploads ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your uploads...</p>
                  </div>
                ) : myUploads.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No uploads yet. Click "New Upload" to get started!</p>
                  </div>
                ) : (
                  <ContentGrid content={myUploads} columns={4} />
                )}
              </TabsContent>
            )}

            {/* Playlists Tab */}
            <TabsContent value="playlists">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Your Playlists</h2>
                <Dialog open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Playlist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Playlist</DialogTitle>
                      <DialogDescription>
                        Create a new playlist to organize your favorite content.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="playlist-name">Playlist Name</Label>
                        <Input
                          id="playlist-name"
                          name="playlist-name"
                          placeholder="My Awesome Playlist"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="playlist-public">Public Playlist</Label>
                          <p className="text-sm text-muted-foreground">
                            Others can view and follow this playlist
                          </p>
                        </div>
                        <Switch
                          id="playlist-public"
                          checked={newPlaylistIsPublic}
                          onCheckedChange={setNewPlaylistIsPublic}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreatePlaylistOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Edit Playlist Dialog */}
              <Dialog open={editingPlaylist !== null} onOpenChange={(open) => !open && setEditingPlaylist(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Playlist</DialogTitle>
                    <DialogDescription>
                      Update your playlist details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-playlist-name">Playlist Name</Label>
                      <Input
                        id="edit-playlist-name"
                        name="edit-playlist-name"
                        placeholder="My Awesome Playlist"
                        value={editPlaylistName}
                        onChange={(e) => setEditPlaylistName(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="edit-playlist-public">Public Playlist</Label>
                        <p className="text-sm text-muted-foreground">
                          Others can view and follow this playlist
                        </p>
                      </div>
                      <Switch
                        id="edit-playlist-public"
                        checked={editPlaylistIsPublic}
                        onCheckedChange={setEditPlaylistIsPublic}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingPlaylist(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={!editPlaylistName.trim()}>
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {loadingPlaylists ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading playlists...</p>
                </div>
              ) : playlists.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <PlaySquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Playlists</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first playlist to organize content
                    </p>
                    <Button onClick={() => setCreatePlaylistOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Playlist
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map((playlist) => (
                  <Card
                    key={playlist.id}
                    className="hover:border-primary/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                  >
                    <div className="aspect-video bg-muted rounded-t-lg overflow-hidden relative">
                      {playlist.thumbnail ? (
                        <img 
                          src={playlist.thumbnail}
                          alt={playlist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <PlaySquare className="h-16 w-16 text-primary/50" />
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPlaylist(playlist)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeletePlaylist(playlist.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">{playlist.name}</CardTitle>
                      <CardDescription>
                        {playlist.itemCount} items • {playlist.isPublic ? 'Public' : 'Private'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Watch History</h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setHistoryPaused(!historyPaused)}
                  >
                    {historyPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume History
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause History
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setHideHistory(!hideHistory)}
                  >
                    {hideHistory ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show History
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide History
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Clear All</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Watch History?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all items from your watch history. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleClearHistory}
                        >
                          Clear History
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {hideHistory ? (
                <div className="text-center py-12">
                  <EyeOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">History is hidden</p>
                </div>
              ) : historyPaused ? (
                <div className="text-center py-12">
                  <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">History tracking is paused</p>
                </div>
              ) : loadingHistory ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading watch history...</p>
                </div>
              ) : watchHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Watch History</h3>
                  <p className="text-muted-foreground">Videos you watch will appear here</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedHistory).map(([date, items]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-muted-foreground">{date}</h3>
                      </div>
                      <div className="space-y-3">
                        {items.map((item) => {
                          const progress = Math.floor(Math.random() * 100);
                          return (
                            <Card key={item.id} className="hover:border-primary/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex gap-4">
                                  <Link to={`/watch/${item.id}`} className="flex-shrink-0">
                                    <img
                                      src={item.thumbnail}
                                      alt={item.title}
                                      className="w-32 h-20 object-cover rounded"
                                    />
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <Link to={`/watch/${item.id}`}>
                                      <h4 className="font-medium hover:text-primary transition-colors line-clamp-1">
                                        {item.title}
                                      </h4>
                                    </Link>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {item.creator?.displayName || item.creator?.name || 'Unknown'} • {(item.viewCount || item.views || 0).toLocaleString()} views
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      <Progress value={progress} className="h-1.5" />
                                      <p className="text-xs text-muted-foreground">
                                        Watched {progress}% • {(item as any).watchedAt
                                          ? new Date((item as any).watchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                          : 'Recently'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Liked Tab */}
            <TabsContent value="liked">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Liked Content</h2>
                <Select value={likedSort} onValueChange={(value: any) => setLikedSort(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">
                      <div className="flex items-center gap-2">
                        <SortDesc className="h-4 w-4" />
                        Recent
                      </div>
                    </SelectItem>
                    <SelectItem value="views">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Most Viewed
              </div>
                    </SelectItem>
                    <SelectItem value="oldest">
                      <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        Oldest
                    </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loadingLiked ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading liked content...</p>
                </div>
              ) : likedContent.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Liked Content</h3>
                  <p className="text-muted-foreground">Videos you like will appear here</p>
                </div>
              ) : (
                <ContentGrid content={likedContent} columns={4} />
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="grid gap-6 max-w-3xl">
                {/* Appearance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      Appearance
                    </CardTitle>
                    <CardDescription>Customize how the app looks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Theme</Label>
                        <p className="text-sm text-muted-foreground">Choose between light, dark, or system theme</p>
                      </div>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* More Settings Link */}
                <div className="flex items-center justify-center py-4">
                  <Link
                    to="/settings"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    More settings (Account, Privacy, Notifications, Preferences)
                  </Link>
                </div>

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear Watch History
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Watch History?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all items from your watch history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleClearHistory}
                          >
                            Clear History
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your account and all associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}
