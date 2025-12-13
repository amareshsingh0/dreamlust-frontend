import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Radio, Users, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockContent } from "@/data/mockData";

const Live = () => {
  // Filter live content (mock - in real app, filter by isLive flag)
  const liveStreams = mockContent.slice(0, 6).map(content => ({
    ...content,
    viewers: Math.floor(Math.random() * 10000) + 100,
    isLive: true,
  }));

  return (
    <>
      <Helmet>
        <title>Live Streams - Dreamlust</title>
        <meta name="description" content="Watch live streams from your favorite creators" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Radio className="h-8 w-8 text-destructive" />
              <h1 className="text-4xl font-display font-bold">Live Now</h1>
            </div>
            <p className="text-muted-foreground">
              Watch live streams from creators around the world
            </p>
          </div>

          {liveStreams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Live Streams</h3>
                <p className="text-muted-foreground">
                  There are no live streams at the moment. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveStreams.map((stream) => (
                <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Radio className="h-12 w-12 text-destructive mx-auto mb-2 animate-pulse" />
                        <Badge variant="destructive" className="mb-2">
                          LIVE
                        </Badge>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
                      <Eye className="h-3 w-3" />
                      <span className="text-xs font-medium">{stream.viewers.toLocaleString()}</span>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{stream.title}</CardTitle>
                    <CardDescription>
                      {stream.creator.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="default">
                      Watch Live
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

export default Live;

