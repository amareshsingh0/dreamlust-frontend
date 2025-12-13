import { useState } from 'react';
import { 
  User, 
  Settings, 
  Clock, 
  Heart, 
  PlaySquare, 
  Eye,
  EyeOff,
  Bell,
  Shield,
  Moon,
  Sun,
  Globe,
  Lock,
  Mail,
  Key,
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
import { ContentCard } from '@/components/content/ContentCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { mockContent, mockCreators } from '@/data/mockData';
import { countries } from '@/data/countries';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Profile() {
  const [hideHistory, setHideHistory] = useState(false);
  const [historyPaused, setHistoryPaused] = useState(false);
  const [likedSort, setLikedSort] = useState<'recent' | 'views' | 'oldest'>('recent');
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  
  const notifications = useState({
    email: true,
    push: true,
    inApp: true,
    newUploads: true,
    creatorUpdates: true,
    recommendations: false,
  })[0];

  const watchHistory = mockContent.slice(0, 12);
  const likedContent = mockContent.slice(2, 10);
  const pinnedContent = mockContent.slice(0, 3);
  const followedCreators = mockCreators.slice(0, 6);
  
  // Group history by date
  const groupedHistory = watchHistory.reduce((acc, item) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, typeof watchHistory>);

  const playlists = [
    { id: '1', name: 'Favorites', itemCount: 12, isPublic: false, thumbnail: mockContent[0]?.thumbnail },
    { id: '2', name: 'Watch Later', itemCount: 8, isPublic: true, thumbnail: mockContent[1]?.thumbnail },
    { id: '3', name: 'Best of 2024', itemCount: 15, isPublic: false, thumbnail: mockContent[2]?.thumbnail },
  ];

  const handleCreatePlaylist = () => {
    // TODO: Implement playlist creation
    console.log('Creating playlist:', { name: newPlaylistName, isPublic: newPlaylistIsPublic });
    setCreatePlaylistOpen(false);
    setNewPlaylistName('');
    setNewPlaylistIsPublic(false);
  };

  // Mock activity feed
  const activityFeed = [
    { id: '1', type: 'liked', content: mockContent[0], timestamp: '2 hours ago' },
    { id: '2', type: 'watched', content: mockContent[1], timestamp: '5 hours ago' },
    { id: '3', type: 'followed', creator: mockCreators[0], timestamp: '1 day ago' },
    { id: '4', type: 'created_playlist', playlistName: 'Workout Music', timestamp: '2 days ago' },
  ];

  return (
    <>
      <Helmet>
        <title>Your Profile - DreamLust</title>
        <meta name="description" content="Manage your DreamLust profile, watch history, and preferences." />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Profile Header */}
          <ProfileHeader
            isOwnProfile={true}
            isCreator={false}
            username="johndoe"
            displayName="John Doe"
            avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
            bio="Content creator and streaming enthusiast. Love sharing amazing experiences with the community."
            socialLinks={{
              twitter: 'https://twitter.com/johndoe',
              instagram: 'https://instagram.com/johndoe',
              website: 'https://johndoe.com',
            }}
            stats={{
              following: 24,
              watched: 156,
              playlists: 12,
            }}
            memberSince="Jan 2024"
            onEdit={() => {}}
          />

          {/* Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="overview" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="playlists" className="gap-2">
                <PlaySquare className="h-4 w-4" />
                <span className="hidden sm:inline">Playlists</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="liked" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Liked</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
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
                <div className="space-y-3">
                  {activityFeed.map((activity) => (
                    <Card key={activity.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {activity.type === 'liked' && activity.content && (
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
                          {activity.type === 'watched' && activity.content && (
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
                          {activity.type === 'followed' && activity.creator && (
                            <>
                              <img 
                                src={activity.creator.avatar} 
                                alt={activity.creator.name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1">
                                <p className="text-sm">
                                  <Users className="inline h-4 w-4 mr-1" />
                                  Started following <Link to={`/creator/${activity.creator.username}`} className="font-medium hover:text-primary">{activity.creator.name}</Link>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                              </div>
                            </>
                          )}
                          {activity.type === 'created_playlist' && (
                            <>
                              <PlaySquare className="h-10 w-10 text-primary" />
                              <div className="flex-1">
                                <p className="text-sm">
                                  Created playlist <span className="font-medium">{activity.playlistName}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Followed Creators */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold">Followed Creators</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/following">View All</Link>
                  </Button>
                </div>
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
                          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {creator.name}
                          </h3>
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
              </div>
            </TabsContent>

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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <Card key={playlist.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
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
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                          const progress = Math.floor(Math.random() * 100); // Mock progress
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
                                      {item.creator.name} • {item.views.toLocaleString()} views
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      <Progress value={progress} className="h-1.5" />
                                      <p className="text-xs text-muted-foreground">
                                        Watched {progress}% • {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
              <ContentGrid content={likedContent} columns={4} />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="grid gap-6 max-w-3xl">
                {/* Account */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Account
                    </CardTitle>
                    <CardDescription>Manage your account information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex gap-2">
                        <Input id="email" name="email" type="email" defaultValue="john.doe@example.com" />
                        <Button variant="outline" size="icon">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="flex gap-2">
                        <Input id="password" name="password" type="password" placeholder="••••••••" />
                        <Button variant="outline">
                          <Key className="h-4 w-4 mr-2" />
                          Change
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Privacy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Privacy
                    </CardTitle>
                    <CardDescription>Control your privacy settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                      <Label htmlFor="hide-history">Hide watch history</Label>
                        <p className="text-sm text-muted-foreground">Prevent others from seeing what you watch</p>
                      </div>
                      <Switch 
                        id="hide-history" 
                        checked={hideHistory}
                        onCheckedChange={setHideHistory}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                      <Label htmlFor="anonymous">Anonymous browsing mode</Label>
                        <p className="text-sm text-muted-foreground">Don't save watch history while browsing</p>
                      </div>
                      <Switch id="anonymous" />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                      <Label htmlFor="private-playlists">Make all playlists private by default</Label>
                        <p className="text-sm text-muted-foreground">New playlists will be private</p>
                      </div>
                      <Switch id="private-playlists" />
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notifications
                    </CardTitle>
                    <CardDescription>Manage your notification preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch defaultChecked={notifications.email} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive push notifications</p>
                      </div>
                      <Switch defaultChecked={notifications.push} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>In-App Notifications</Label>
                        <p className="text-sm text-muted-foreground">Show notifications in the app</p>
                      </div>
                      <Switch defaultChecked={notifications.inApp} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Uploads</Label>
                        <p className="text-sm text-muted-foreground">Get notified about new content from followed creators</p>
                      </div>
                      <Switch defaultChecked={notifications.newUploads} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Creator Updates</Label>
                        <p className="text-sm text-muted-foreground">Receive updates and announcements from creators</p>
                      </div>
                      <Switch defaultChecked={notifications.creatorUpdates} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Recommendations</Label>
                        <p className="text-sm text-muted-foreground">Get personalized content recommendations</p>
                      </div>
                      <Switch defaultChecked={notifications.recommendations} />
                    </div>
                  </CardContent>
                </Card>

                {/* Playback */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PlaySquare className="h-5 w-5" />
                      Playback
                    </CardTitle>
                    <CardDescription>Customize your viewing experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-quality">Default Quality</Label>
                      <Select defaultValue="auto">
                        <SelectTrigger id="default-quality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="4k">4K</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="480p">480p</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoplay">Autoplay Next</Label>
                        <p className="text-sm text-muted-foreground">Automatically play next video</p>
                      </div>
                      <Switch id="autoplay" defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                {/* Language & Region */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Language & Region
                    </CardTitle>
                    <CardDescription>Set your preferred language and region</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="it">Italian</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="ru">Russian</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="ur">Urdu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select defaultValue="us">
                        <SelectTrigger id="region">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Theme */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="h-5 w-5" />
                      Appearance
                    </CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select defaultValue="dark">
                        <SelectTrigger id="theme">
                          <SelectValue />
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
                          <SelectItem value="auto">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

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
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
