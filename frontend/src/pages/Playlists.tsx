import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { PlaySquare, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Playlists = () => {
  // Mock playlists (in real app, fetch from Supabase)
  const playlists = [
    { id: '1', name: 'My Favorites', itemCount: 12, isPublic: false },
    { id: '2', name: 'Workout Music', itemCount: 8, isPublic: true },
    { id: '3', name: 'Relaxing Videos', itemCount: 15, isPublic: false },
    { id: '4', name: 'Trending Now', itemCount: 20, isPublic: true },
  ];

  return (
    <>
      <Helmet>
        <title>Playlists - Dreamlust</title>
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Playlist
            </Button>
          </div>

          {playlists.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PlaySquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Playlists</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first playlist to organize content
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Playlist
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {playlists.map((playlist) => (
                <Card key={playlist.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <PlaySquare className="h-16 w-16 text-primary/50" />
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
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Playlists;

