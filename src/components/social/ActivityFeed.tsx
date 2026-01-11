/**
 * Activity Feed Component
 * Displays user activity feed with filters
 */

import { useState, useEffect } from 'react';
import { Clock, Upload, Heart, MessageCircle, UserPlus, ListPlus, FolderPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  actorId: string;
  actor?: {
    id: string;
    username: string;
    display_name: string;
    avatar?: string;
  };
  type: 'upload' | 'like' | 'comment' | 'follow' | 'playlist_create' | 'collection_create';
  targetType: 'content' | 'playlist' | 'user' | 'collection';
  targetId: string;
  text?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  userId?: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!userId) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await (api as any).get(`/social/activity-feed?type=${filter === 'all' ? '' : filter}`);
        if (response.data.success) {
          setActivities(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch activity feed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [userId, filter]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'like':
        return <Heart className="h-4 w-4" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'follow':
        return <UserPlus className="h-4 w-4" />;
      case 'playlist_create':
        return <ListPlus className="h-4 w-4" />;
      case 'collection_create':
        return <FolderPlus className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading activity feed...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upload">Uploads</TabsTrigger>
            <TabsTrigger value="like">Likes</TabsTrigger>
            <TabsTrigger value="comment">Comments</TabsTrigger>
            <TabsTrigger value="follow">Follows</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activities yet
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={activity.actor?.avatar} />
                      <AvatarFallback>
                        {activity.actor?.display_name?.[0] || activity.actor?.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getActivityIcon(activity.type)}
                        <Link
                          to={`/profile/${activity.actor?.username}`}
                          className="font-medium hover:underline"
                        >
                          {activity.actor?.display_name || activity.actor?.username || 'Someone'}
                        </Link>
                        <span className="text-muted-foreground">{activity.text}</span>
                      </div>

                      {activity.targetType === 'content' && (
                        <Link
                          to={`/watch/${activity.targetId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View content
                        </Link>
                      )}

                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

