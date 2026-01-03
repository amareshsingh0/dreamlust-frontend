import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Radio,
  Loader2,
  Zap,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { LiveChat } from "@/components/live/LiveChat";
import { TagBadge } from "@/components/content/TagBadge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import type { Socket } from 'socket.io-client';

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
  endedAt?: string;
  scheduledFor?: string;
  category?: string;
  tags: string[];
  chatEnabled: boolean;
  isRecorded: boolean;
  recordingUrl?: string;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
}

const LiveStreamPage = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const viewerTrackedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!streamId) {
      navigate("/live");
      return;
    }

    const fetchStream = async () => {
      try {
        setLoading(true);
        const response = await api.live.get<LiveStream>(streamId);

        if (response.success && response.data) {
          const streamData = response.data;
          
          if (streamData.status === 'ended') {
            toast.info("This stream has ended");
            if (streamData.recordingUrl) {
              // Redirect to VOD if available
              navigate(`/watch/${streamId}`);
            }
          }

          setStream({
            id: streamData.id,
            title: streamData.title,
            description: streamData.description,
            thumbnailUrl: streamData.thumbnailUrl,
            playbackUrl: streamData.playbackUrl,
            status: streamData.status,
            viewerCount: streamData.viewerCount,
            peakViewerCount: streamData.peakViewerCount,
            startedAt: streamData.startedAt,
            endedAt: streamData.endedAt,
            scheduledFor: streamData.scheduledFor,
            category: streamData.category,
            tags: streamData.tags,
            chatEnabled: streamData.chatEnabled,
            isRecorded: streamData.isRecorded,
            recordingUrl: streamData.recordingUrl,
            creator: streamData.creator,
          });
          setViewerCount(streamData.viewerCount);

          // Connect to WebSocket and join stream if live
          if (streamData.status === 'live' && !viewerTrackedRef.current) {
            const token = localStorage.getItem('accessToken');
            const socket = getSocket(token || undefined);
            socketRef.current = socket;

            // Join stream room (this will track viewer count)
            socket.emit('join-stream', { streamId: streamData.id });

            // Listen for viewer count updates
            socket.on('viewer-count-update', (data: { streamId: string; viewerCount: number }) => {
              if (data.streamId === streamData.id) {
                setViewerCount(data.viewerCount);
                setStream(prev => prev ? {
                  ...prev,
                  viewerCount: data.viewerCount,
                } : null);
              }
            });

            viewerTrackedRef.current = true;
          }
        } else {
          toast.error("Stream not found");
          navigate("/live");
        }
      } catch (error: any) {
        console.error("Error fetching stream:", error);
        toast.error(error.error?.message || "Failed to load stream");
        navigate("/live");
      } finally {
        setLoading(false);
      }
    };

    fetchStream();

    return () => {
      // Leave stream room (this will decrement viewer count)
      if (socketRef.current && streamId) {
        socketRef.current.emit('leave-stream', { streamId });
        socketRef.current.off('viewer-count-update');
      }
    };
  }, [streamId, navigate]);

  // Poll for stream status updates (not viewer count - that's via WebSocket)
  useEffect(() => {
    if (!stream || stream.status !== 'live') return;

    const statusInterval = setInterval(async () => {
      try {
        const response = await api.live.get<LiveStream>(stream.id);
        if (response.success && response.data) {
          // Only update status, not viewer count (WebSocket handles that)
          const data = response.data;
          if (data.status !== 'live') {
            setStream(prev => prev ? {
              ...prev,
              status: data.status,
              endedAt: data.endedAt,
              recordingUrl: data.recordingUrl,
            } : null);

            // Leave stream room
            if (socketRef.current) {
              socketRef.current.emit('leave-stream', { streamId: stream.id });
              socketRef.current.off('viewer-count-update');
            }

            if (data.recordingUrl) {
              toast.info("Stream ended. Redirecting to recording...");
              setTimeout(() => {
                navigate(`/watch/${stream.id}`);
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error("Error polling stream status:", error);
      }
    }, 10000); // Poll every 10 seconds for status

    return () => {
      clearInterval(statusInterval);
    };
  }, [stream?.id, stream?.status, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!stream) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Stream Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The stream you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate("/live")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Live Streams
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isLive = stream.status === 'live';
  const isScheduled = stream.status === 'idle' && stream.scheduledFor;

  return (
    <>
      <Helmet>
        <title>{stream.title} - Live Stream - PassionFantasia</title>
        <meta name="description" content={stream.description || `Watch ${stream.title} live on PassionFantasia`} />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/live")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Live Streams
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content - Video Player */}
            <div className="lg:col-span-3 space-y-6">
              {/* Video Player */}
              <div className="relative">
                {isLive && stream.playbackUrl ? (
                  <VideoPlayer
                    src={stream.playbackUrl}
                    autoplay={true}
                    controls={true}
                    live={true}
                    lowLatency={true}
                    className="w-full"
                  />
                ) : isScheduled ? (
                  <Card>
                    <CardContent className="aspect-video flex items-center justify-center">
                      <div className="text-center">
                        <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">Stream Scheduled</h3>
                        <p className="text-muted-foreground">
                          This stream will start {stream.scheduledFor ? new Date(stream.scheduledFor).toLocaleString() : 'soon'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : stream.thumbnailUrl ? (
                  <Card>
                    <CardContent className="aspect-video p-0">
                      <img
                        src={stream.thumbnailUrl}
                        alt={stream.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="aspect-video flex items-center justify-center">
                      <div className="text-center">
                        <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">Stream Offline</h3>
                        <p className="text-muted-foreground">
                          {stream.status === 'ended' ? 'This stream has ended' : 'This stream is not currently live'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Live Indicator */}
                {isLive && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-destructive text-destructive-foreground flex items-center gap-2 px-3 py-1.5">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="font-bold">LIVE</span>
                      <span className="text-xs font-normal opacity-90">
                        {viewerCount} watching
                      </span>
                    </Badge>
                  </div>
                )}
              </div>

              {/* Stream Info */}
              <Card>
                <CardContent className="pt-6">
                  <h1 className="text-3xl font-bold mb-4">{stream.title}</h1>
                  
                  {/* Creator Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <Link to={`/creator/${stream.creator.username}`}>
                      <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                        <AvatarImage src={stream.creator.avatar} />
                        <AvatarFallback>
                          {stream.creator.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <Link 
                        to={`/creator/${stream.creator.username}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <span className="font-semibold">{stream.creator.name}</span>
                        {stream.creator.isVerified && (
                          <Zap className="h-4 w-4 text-primary" />
                        )}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        @{stream.creator.username}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Description */}
                  {stream.description && (
                    <div className="mb-4">
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {stream.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {stream.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {stream.tags.map((tag, index) => (
                        <TagBadge key={index} tag={tag} />
                      ))}
                    </div>
                  )}

                  {/* Category */}
                  {stream.category && (
                    <div className="mt-4">
                      <Badge variant="outline">{stream.category}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Chat */}
            <div className="lg:col-span-1">
              {stream.chatEnabled && isLive ? (
                <Card className="h-[calc(100vh-200px)] flex flex-col">
                  <CardContent className="flex-1 p-0 overflow-hidden">
                    <LiveChat streamId={stream.id} chatEnabled={stream.chatEnabled} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {!stream.chatEnabled 
                        ? "Chat is disabled for this stream"
                        : "Chat will be available when the stream goes live"
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default LiveStreamPage;
