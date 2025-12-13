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
  Sun
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { mockContent } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';

export default function Profile() {
  const [hideHistory, setHideHistory] = useState(false);
  const [notifications, setNotifications] = useState({
    newUploads: true,
    creatorUpdates: true,
    recommendations: false,
  });

  const watchHistory = mockContent.slice(0, 6);
  const likedContent = mockContent.slice(2, 8);

  return (
    <>
      <Helmet>
        <title>Your Profile - DreamLust</title>
        <meta name="description" content="Manage your DreamLust profile, watch history, and preferences." />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <Avatar className="h-24 w-24 border-4 border-primary/50">
              <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200" />
              <AvatarFallback className="text-2xl">JD</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold mb-1">John Doe</h1>
              <p className="text-muted-foreground mb-4">@johndoe • Member since Jan 2024</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-bold">24</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-bold">156</span>
                  <span className="text-muted-foreground ml-1">Watched</span>
                </div>
                <div>
                  <span className="font-bold">12</span>
                  <span className="text-muted-foreground ml-1">Playlists</span>
                </div>
              </div>
            </div>

            <Button className="gap-2">
              <Settings className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="liked" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Liked</span>
              </TabsTrigger>
              <TabsTrigger value="playlists" className="gap-2">
                <PlaySquare className="h-4 w-4" />
                <span className="hidden sm:inline">Playlists</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Watch History */}
            <TabsContent value="history">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Watch History</h2>
                <div className="flex items-center gap-2">
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
                  <Button variant="outline" size="sm">Clear All</Button>
                </div>
              </div>
              
              {hideHistory ? (
                <div className="text-center py-12">
                  <EyeOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">History is hidden</p>
                </div>
              ) : (
                <ContentGrid content={watchHistory} columns={3} />
              )}
            </TabsContent>

            {/* Liked Content */}
            <TabsContent value="liked">
              <h2 className="font-display text-xl font-bold mb-6">Liked Content</h2>
              <ContentGrid content={likedContent} columns={3} />
            </TabsContent>

            {/* Playlists */}
            <TabsContent value="playlists">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">Your Playlists</h2>
                <Button className="gap-2">
                  <PlaySquare className="h-4 w-4" />
                  Create Playlist
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Favorites', 'Watch Later', 'Best of 2024'].map((name, i) => (
                  <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                      <img 
                        src={mockContent[i]?.thumbnail}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">{name}</CardTitle>
                      <CardDescription>{(i + 1) * 8} items • {i === 0 ? 'Private' : 'Public'}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings">
              <div className="grid gap-6 max-w-2xl">
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
                      <Label htmlFor="hide-history">Hide watch history</Label>
                      <Switch 
                        id="hide-history" 
                        checked={hideHistory}
                        onCheckedChange={setHideHistory}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="anonymous">Anonymous browsing mode</Label>
                      <Switch id="anonymous" />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="private-playlists">Make all playlists private by default</Label>
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
                      <Label htmlFor="new-uploads">New uploads from followed creators</Label>
                      <Switch 
                        id="new-uploads" 
                        checked={notifications.newUploads}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newUploads: checked }))}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="creator-updates">Creator updates & announcements</Label>
                      <Switch 
                        id="creator-updates"
                        checked={notifications.creatorUpdates}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, creatorUpdates: checked }))}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="recommendations">Personalized recommendations</Label>
                      <Switch 
                        id="recommendations"
                        checked={notifications.recommendations}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, recommendations: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="h-5 w-5" />
                      Appearance
                    </CardTitle>
                    <CardDescription>Customize your viewing experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dark-mode">Dark mode</Label>
                      <Switch id="dark-mode" defaultChecked />
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
                    <Button variant="outline" className="w-full">Clear Watch History</Button>
                    <Button variant="destructive" className="w-full">Delete Account</Button>
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
