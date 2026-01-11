import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveStreamCard } from "@/components/content/LiveStreamCard";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  status: 'idle' | 'live' | 'ended';
  viewerCount: number;
  peakViewerCount: number;
  startedAt?: string;
  scheduledFor?: string;
  category?: string;
  tags: string[];
  chatEnabled: boolean;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
}

const Live = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        
        // Fetch live streams
        const liveResponse = await api.live.getAll({ status: 'live', limit: 20 });
        if (liveResponse.success && liveResponse.data) {
          const data = liveResponse.data as { streams: LiveStream[] };
          setLiveStreams(data.streams || []);
        }

        // Fetch upcoming streams
        const upcomingResponse = await api.live.getAll({ status: 'upcoming', limit: 20 });
        if (upcomingResponse.success && upcomingResponse.data) {
          const data = upcomingResponse.data as { streams: LiveStream[] };
          setUpcomingStreams(data.streams || []);
        }
      } catch (error: any) {
        console.error("Error fetching live streams:", error);
        toast.error("Failed to load live streams");
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeUntil = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  // Transform LiveStream to Content format for LiveStreamCard
  const transformStream = (stream: LiveStream) => ({
    id: stream.id,
    title: stream.title,
    thumbnail: stream.thumbnailUrl || '',
    duration: '0:00',
    views: stream.viewerCount,
    likes: 0,
    createdAt: stream.startedAt || new Date().toISOString(),
    creator: {
      id: stream.creator.id,
      name: stream.creator.name,
      username: stream.creator.username,
      avatar: stream.creator.avatar || '',
      isVerified: stream.creator.isVerified,
      bio: '',
      followers: 0,
      views: 0,
      contentCount: 0,
    },
    type: 'live' as const,
    quality: [] as string[],
    tags: stream.tags,
    category: stream.category || '',
    description: stream.description,
    isLive: stream.status === 'live',
    isPremium: false,
    viewers: stream.viewerCount,
  });

  return (
    <>
      <Helmet>
        <title>Live Streams - PassionFantasia</title>
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

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : liveStreams.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Live Streams</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no live streams at the moment. Check back later!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveStreams.map((stream) => (
                  <LiveStreamCard key={stream.id} stream={transformStream(stream)} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Streams Section */}
          {!loading && upcomingStreams.length > 0 && (
            <div>
              <h2 className="text-2xl font-display font-bold mb-6">Upcoming Streams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingStreams.map((stream) => (
                  <LiveStreamCard 
                    key={stream.id} 
                    stream={transformStream(stream)}
                    variant="upcoming"
                    startsIn={stream.scheduledFor ? formatTimeUntil(stream.scheduledFor) : undefined}
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
