/**
 * Discover Collections Component
 * Browse featured and trending collections
 */

import { useState, useEffect } from 'react';
import { FolderOpen, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

interface Collection {
  id: string;
  name: string;
  description?: string;
  owner: {
    id: string;
    username: string;
    display_name: string;
    avatar?: string;
  };
  isPublic: boolean;
  isCollaborative: boolean;
  followers: number;
  thumbnailUrl?: string;
  _count?: {
    items: number;
  };
}

export function DiscoverCollections() {
  const [featuredCollections, setFeaturedCollections] = useState<Collection[]>([]);
  const [trendingCollections, setTrendingCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        const [featuredRes, trendingRes] = await Promise.all([
          (api as any).get('/social/collections/featured?limit=10'),
          (api as any).get('/social/collections/trending?limit=20'),
        ]) as [any, any];

        if (featuredRes.data.success) {
          setFeaturedCollections(featuredRes.data.data);
        }
        if (trendingRes.data.success) {
          setTrendingCollections(trendingRes.data.data);
        }
      } catch {
        // Failed to fetch collections
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Tabs defaultValue="featured" className="w-full">
        <TabsList>
          <TabsTrigger value="featured">Featured Collections</TabsTrigger>
          <TabsTrigger value="trending">Trending Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2">Featured Collections</h2>
            <p className="text-muted-foreground">
              Curated collections from top creators
            </p>
          </div>
          <CollectionGrid collections={featuredCollections} />
        </TabsContent>

        <TabsContent value="trending" className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2">Trending Collections</h2>
            <p className="text-muted-foreground">
              Popular collections this week
            </p>
          </div>
          <CollectionGrid collections={trendingCollections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CollectionGrid({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No collections found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {collections.map((collection) => (
        <Link key={collection.id} to={`/collections/${collection.id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            {collection.thumbnailUrl ? (
              <img
                src={collection.thumbnailUrl}
                alt={collection.name}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="line-clamp-2">{collection.name}</CardTitle>
              {collection.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {collection.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{collection.followers}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{collection._count?.items || 0} items</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={collection.owner.avatar} />
                  <AvatarFallback>
                    {collection.owner.display_name?.[0] || collection.owner.username?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {collection.owner.display_name || collection.owner.username}
                </span>
              </div>
              {collection.isCollaborative && (
                <Badge variant="secondary" className="mt-2">
                  Collaborative
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

