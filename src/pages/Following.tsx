import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Following = () => {
  // Mock following list (in real app, fetch from Supabase)
  const following = [
    { id: '1', username: 'creator1', displayName: 'Creator One', avatar: '', isVerified: true, followerCount: 125000 },
    { id: '2', username: 'creator2', displayName: 'Creator Two', avatar: '', isVerified: false, followerCount: 45000 },
    { id: '3', username: 'creator3', displayName: 'Creator Three', avatar: '', isVerified: true, followerCount: 89000 },
    { id: '4', username: 'creator4', displayName: 'Creator Four', avatar: '', isVerified: false, followerCount: 23000 },
  ];

  return (
    <>
      <Helmet>
        <title>Following - Dreamlust</title>
        <meta name="description" content="Creators you're following" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-display font-bold">Following</h1>
            </div>
            <p className="text-muted-foreground">
              Creators you're following
            </p>
          </div>

          {following.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Not Following Anyone</h3>
                <p className="text-muted-foreground mb-4">
                  Start following creators to see their content
                </p>
                <Button asChild>
                  <Link to="/creators">Discover Creators</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {following.map((creator) => (
                <Card key={creator.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={creator.avatar} />
                        <AvatarFallback>{creator.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{creator.displayName}</CardTitle>
                          {creator.isVerified && (
                            <Badge variant="default" className="text-xs">✓</Badge>
                          )}
                        </div>
                        <CardDescription>@{creator.username}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          {creator.followerCount.toLocaleString()} followers
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <a href={`/creator/${creator.username}`}>View Profile</a>
                    </Button>
                    <Button variant="secondary" size="icon">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Following;

