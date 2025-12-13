import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveStreamCard } from "@/components/content/LiveStreamCard";
import { mockContent, mockCreators } from "@/data/mockData";

const Live = () => {
  // Live streams with viewer counts
  const liveStreams = [
    {
      ...mockContent[6], // "Live: Creative Session"
      thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
      viewers: 1250,
      creator: mockCreators[0], // Luna Starlight
    },
    {
      ...mockContent[3], // VR Experience
      thumbnail: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=800',
      viewers: 890,
      creator: mockCreators[3], // Neo Flux
      title: 'VR Experience Demo',
    },
    {
      ...mockContent[1], // Mountain Peak
      thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
      viewers: 542,
      creator: mockCreators[1], // Max Thunder
      title: 'Adventure Live Stream',
    },
  ].map(stream => ({
    ...stream,
    isLive: true,
    type: 'live' as const,
  }));

  // Upcoming streams
  const upcomingStreams = [
    {
      ...mockContent[1],
      thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800',
      creator: mockCreators[1], // Max Thunder
      title: 'Art Workshop',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
  ];

  const formatTimeUntil = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  return (
    <>
      <Helmet>
        <title>Live Streams - Dreamlust</title>
        <meta name="description" content="Watch live streams from your favorite creators" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Radio className="h-8 w-8 text-destructive" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-destructive rounded-full animate-ping" />
                </div>
              </div>
              <h1 className="text-4xl font-display font-bold">Live Streams</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Watch creators in real-time
            </p>
          </div>

          {/* Live Now Section */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <h2 className="text-2xl font-display font-bold">Live Now</h2>
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
                  <LiveStreamCard key={stream.id} stream={stream} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Streams Section */}
          {upcomingStreams.length > 0 && (
            <div>
              <h2 className="text-2xl font-display font-bold mb-6">Upcoming Streams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingStreams.map((stream) => (
                  <LiveStreamCard 
                    key={stream.id} 
                    stream={stream}
                    variant="upcoming"
                    startsIn={formatTimeUntil(stream.scheduledAt)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Live;
