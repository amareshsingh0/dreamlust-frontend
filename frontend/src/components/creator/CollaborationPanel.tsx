/**
 * Collaboration Panel Component
 * Manages collaborators for content
 */

import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Edit2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Collaborator {
  userId: string;
  role: 'editor' | 'viewer';
  permissions: string[];
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar?: string;
  };
}

interface CollaborationPanelProps {
  contentId: string;
}

export function CollaborationPanel({ contentId }: CollaborationPanelProps) {
  const { user } = useAuth();
  const [collaboration, setCollaboration] = useState<{
    id: string;
    contentId: string;
    ownerId: string;
    collaborators: Collaborator[];
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    username: string;
    display_name: string;
    avatar?: string;
  }>>([]);
  const [isOwner, setIsOwner] = useState(false);

  const fetchCollaboration = async () => {
    try {
      const response = await (api as any).get(`/creator-tools/collaboration/${contentId}`);
      if (response.data.success) {
        setCollaboration(response.data.data);
        setIsOwner(response.data.data?.ownerId === user?.id);
      }
    } catch {
      // Failed to fetch collaboration
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaboration();
  }, [contentId, user?.id]);

  const handleAddCollaborator = async (selectedUser: {
    id: string;
    username: string;
    display_name: string;
    avatar?: string;
  }) => {
    if (!collaboration) {
      // Create new collaboration
      try {
        const response = await (api as any).post('/creator-tools/collaboration', {
          contentId,
          collaborators: [
            {
              userId: selectedUser.id,
              role: 'viewer',
              permissions: [],
            },
          ],
        });

        if (response.data.success) {
          toast.success('Collaborator added');
          fetchCollaboration();
        }
      } catch (error: unknown) {
        const apiError = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
        toast.error(apiError || 'Failed to add collaborator');
      }
    } else {
      try {
        const response = await (api as any).post(`/creator-tools/collaboration/${contentId}/add`, {
          userId: selectedUser.id,
          role: 'viewer',
          permissions: [],
        });

        if (response.data.success) {
          toast.success('Collaborator added');
          fetchCollaboration();
        }
      } catch (error: unknown) {
        const apiError = error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
        toast.error(apiError || 'Failed to add collaborator');
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUpdateRole = async (userId: string, role: 'editor' | 'viewer') => {
    try {
      const response = await (api as any).patch(`/creator-tools/collaboration/${contentId}/update`, {
        userId,
        role,
      });

      if (response.data.success) {
        toast.success('Collaborator role updated');
        fetchCollaboration();
      }
    } catch (error: unknown) {
      const apiError = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(apiError || 'Failed to update role');
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      const response = await (api as any).delete(`/creator-tools/collaboration/${contentId}/remove/${userId}`);

      if (response.data.success) {
        toast.success('Collaborator removed');
        fetchCollaboration();
      }
    } catch (error: unknown) {
      const apiError = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(apiError || 'Failed to remove collaborator');
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // In production, this would call a user search API
      // For now, we'll use a placeholder
      const response = await (api as any).get(`/search/users?q=${query}`);
      if (response.data.success) {
        setSearchResults(response.data.data || []);
      }
    } catch {
      // Failed to search users
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const collaborators = collaboration?.collaborators || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Collaborators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collaborator List */}
        <div className="space-y-2">
          {collaborators.map((collab) => (
            <div
              key={collab.userId}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={collab.user?.avatar} />
                  <AvatarFallback>
                    {collab.user?.display_name?.[0] || collab.user?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {collab.user?.display_name || collab.user?.username || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">@{collab.user?.username}</p>
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <Select
                    value={collab.role}
                    onValueChange={(value: 'editor' | 'viewer') =>
                      handleUpdateRole(collab.userId, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit2 className="h-4 w-4" />
                          Editor
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Viewer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCollaborator(collab.userId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!isOwner && (
                <Badge variant={collab.role === 'editor' ? 'default' : 'secondary'}>
                  {collab.role}
                </Badge>
              )}
            </div>
          ))}

          {collaborators.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No collaborators yet
            </p>
          )}
        </div>

        {/* Invite Collaborator */}
        {isOwner && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Collaborator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Collaborator</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => handleAddCollaborator(result)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={result.avatar} />
                            <AvatarFallback>{result.display_name?.[0] || result.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{result.display_name || result.username}</p>
                            <p className="text-sm text-muted-foreground">@{result.username}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

