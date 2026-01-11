import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { PlaySquare, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

interface Playlist {
  id: string;
  name: string;
  itemCount: number;
  isPublic: boolean;
  thumbnail?: string;
}

const Playlists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      try {
        const response = await api.playlists.get<Playlist[]>();
        if (response.success && response.data) {
          setPlaylists(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const response = await api.playlists.post<Playlist>({
        name: newPlaylistName,
        isPublic: newPlaylistIsPublic,
      });
      if (response.success && response.data) {
        setPlaylists([...playlists, response.data]);
        setCreatePlaylistOpen(false);
        setNewPlaylistName('');
        setNewPlaylistIsPublic(false);
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Playlists - PassionFantasia</title>
        <meta name="description" content="Your playlists" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <PlaySquare className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-display font-bold">Playlists</h1>
              </div>
              <p className="text-muted-foreground">
                Organize your favorite content into playlists
              </p>
            </div>
            <Dialog open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Playlist
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
                      name="playlist-public"
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

          {loading ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {playlists.map((playlist) => (
                <Link key={playlist.id} to={`/playlist/${playlist.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                      {playlist.thumbnail ? (
                        <img
                          src={playlist.thumbnail}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlaySquare className="h-16 w-16 text-primary/50" />
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="line-clamp-1">{playlist.name}</CardTitle>
                        {playlist.isPublic && (
                          <Badge variant="secondary" className="ml-2">Public</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {playlist.itemCount} items
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Playlists;

