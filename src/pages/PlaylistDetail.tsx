import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  PlaySquare, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2,
  GripVertical,
  X,
  Play,
  Plus
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';

interface PlaylistItem {
  id: string;
  position: number;
  addedAt: string;
  content: {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    views: number;
    creator: {
      id: string;
      handle: string;
      displayName: string;
      avatar: string;
    };
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  thumbnail?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  items: PlaylistItem[];
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch playlist info and items in parallel
        const [playlistResponse, itemsResponse] = await Promise.all([
          api.playlists.get<Playlist>({ id }),
          api.playlists.getItems<{
            items: Array<{
              id: string;
              sortOrder: number;
              createdAt: string;
              content: {
                id: string;
                title: string;
                thumbnail: string;
                duration: number;
                viewCount: number;
                creator: {
                  id: string;
                  handle: string;
                  displayName: string;
                  avatar: string;
                };
              };
            }>;
            pagination: { page: number; limit: number; total: number; pages: number };
          }>(id, { limit: 100 }),
        ]);

        if (playlistResponse.success && playlistResponse.data) {
          setPlaylist(playlistResponse.data);
          setEditName(playlistResponse.data.name);
          setEditDescription(playlistResponse.data.description || '');
          setEditIsPublic(playlistResponse.data.isPublic);
        }

        if (itemsResponse.success && itemsResponse.data?.items) {
          // Transform API response to match expected format
          const transformedItems: PlaylistItem[] = itemsResponse.data.items.map((item, index) => ({
            id: item.id,
            position: item.sortOrder ?? index,
            addedAt: item.createdAt,
            content: {
              id: item.content.id,
              title: item.content.title,
              thumbnail: item.content.thumbnail,
              duration: item.content.duration
                ? `${Math.floor(item.content.duration / 60)}:${String(item.content.duration % 60).padStart(2, '0')}`
                : '0:00',
              views: item.content.viewCount || 0,
              creator: {
                id: item.content.creator?.id || '',
                handle: item.content.creator?.handle || '',
                displayName: item.content.creator?.displayName || 'Unknown',
                avatar: item.content.creator?.avatar || '',
              },
            },
          }));
          setItems(transformedItems);
        }
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
        toast({
          title: 'Error',
          description: 'Failed to load playlist',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [id, toast]);

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) return;
    try {
      const response = await api.playlists.put<Playlist>(id, {
        name: editName,
        description: editDescription || null,
        isPublic: editIsPublic,
      });
      if (response.success && response.data) {
        setPlaylist(response.data);
        setIsEditing(false);
        toast({
          title: 'Success',
          description: 'Playlist updated successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to update playlist',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      const response = await api.playlists.delete(id);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Playlist deleted successfully',
        });
        navigate('/playlists');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to delete playlist',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!id) return;
    try {
      const response = await api.playlists.removeItem(id, itemId);
      if (response.success) {
        setItems(items.filter(item => item.id !== itemId));
        if (playlist) {
          setPlaylist({ ...playlist, itemCount: playlist.itemCount - 1 });
        }
        toast({
          title: 'Success',
          description: 'Item removed from playlist',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to remove item',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/playlist/${id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'Playlist link has been copied to clipboard.',
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    if (!draggedItem || !id) return;

    const draggedIndex = items.findIndex(item => item.id === draggedItem);
    const targetIndex = items.findIndex(item => item.position === targetPosition);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    // Reorder items locally
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // Update positions
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      position: index,
    }));

    setItems(reorderedItems);
    setDraggedItem(null);

    // Send reorder request to backend
    try {
      await api.playlists.reorder(id, {
        items: reorderedItems.map(item => ({
          id: item.id,
          position: item.position,
        })),
      });
      toast({
        title: 'Success',
        description: 'Playlist reordered successfully',
      });
    } catch (error: any) {
      // Revert on error
      setItems(items);
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to reorder playlist',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading playlist...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!playlist) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
            <Button asChild>
              <Link to="/playlists">Back to Playlists</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{playlist.name} - PassionFantasia</title>
        <meta name="description" content={playlist.description || `Playlist: ${playlist.name}`} />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <PlaySquare className="h-8 w-8 text-primary" />
                  <h1 className="text-4xl font-display font-bold">{playlist.name}</h1>
                  {playlist.isPublic && (
                    <Badge variant="secondary">Public</Badge>
                  )}
                </div>
                {playlist.description && (
                  <p className="text-muted-foreground text-lg mb-4">{playlist.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{playlist.itemCount} items</span>
                  {playlist.user && (
                    <>
                      <span>•</span>
                      <Link
                        to={`/creator/${playlist.user.username}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={playlist.user.avatar} />
                          <AvatarFallback>{(playlist.user.displayName || 'U')[0]}</AvatarFallback>
                        </Avatar>
                        <span>{playlist.user.displayName || playlist.user.username}</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Playlist</DialogTitle>
                <DialogDescription>
                  Update your playlist details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Playlist Name</Label>
                  <Input
                    id="edit-name"
                    name="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    name="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-public">Public Playlist</Label>
                    <p className="text-sm text-muted-foreground">
                      Others can view and follow this playlist
                    </p>
                  </div>
                  <Switch
                    id="edit-public"
                    checked={editIsPublic}
                    onCheckedChange={setEditIsPublic}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Playlist Items */}
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PlaySquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Empty Playlist</h3>
                <p className="text-muted-foreground mb-4">
                  This playlist doesn't have any items yet.
                </p>
                <Button asChild>
                  <Link to="/explore">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "group hover:border-primary/50 transition-colors cursor-pointer",
                    draggedItem === item.id && "opacity-50"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.position)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Drag Handle */}
                      <div className="cursor-move text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* Thumbnail */}
                      <Link to={`/watch/${item.content.id}`} className="flex-shrink-0">
                        <img
                          src={item.content.thumbnail}
                          alt={item.content.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                      </Link>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/watch/${item.content.id}`}>
                          <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
                            {item.content.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Link 
                            to={`/creator/${item.content.creator.handle}`}
                            className="hover:text-primary transition-colors"
                          >
                            {item.content.creator.displayName}
                          </Link>
                          <span>•</span>
                          <span>{item.content.views.toLocaleString()} views</span>
                          <span>•</span>
                          <span>{item.content.duration}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link to={`/watch/${item.content.id}`}>
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/watch/${item.content.id}`}>
                                <Play className="h-4 w-4 mr-2" />
                                Play
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

