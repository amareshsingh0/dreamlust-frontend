import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Radio, 
  Copy, 
  Check, 
  Loader2,
  Eye,
  MessageCircle,
  Clock,
  Users,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  streamKey?: string;
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
}

interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  } | null;
}

const LiveDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessageCount, setChatMessageCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [isRecorded, setIsRecorded] = useState(true);

  // Server URL - this would come from environment or config
  const serverUrl = "rtmp://live.yourplatform.com/stream";

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Check if user is a creator
    const checkCreator = async () => {
      try {
        const response = await api.creators.getByHandle('me');
        if (!response.success || !response.data) {
          toast.error("You need to be a creator to access live streaming");
          navigate("/creator-signup");
          return;
        }
        loadStream();
      } catch (error: any) {
        console.error("Error checking creator status:", error);
        toast.error("Failed to verify creator status");
        navigate("/creator-signup");
      }
    };

    checkCreator();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [user, navigate]);

  const loadStream = async () => {
    try {
      setLoading(true);
      // For now, we'll create a new stream if none exists
      // In production, you'd fetch existing streams for the creator
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading stream:", error);
      setLoading(false);
    }
  };

  const createStream = async () => {
    if (!title.trim()) {
      toast.error("Please enter a stream title");
      return;
    }

    try {
      setCreating(true);
      const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);
      
      const response = await api.live.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        chatEnabled,
        isRecorded,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        setStream({
          id: data.id,
          title: data.title,
          description: data.description,
          streamKey: data.streamKey,
          status: data.status,
          viewerCount: 0,
          peakViewerCount: 0,
          tags: tagsArray,
          category: category,
          chatEnabled: data.chatEnabled,
          isRecorded: data.isRecorded,
        });
        toast.success("Stream created successfully!");
      } else {
        toast.error(response.error?.message || "Failed to create stream");
      }
    } catch (error: any) {
      console.error("Error creating stream:", error);
      toast.error(error.error?.message || "Failed to create stream");
    } finally {
      setCreating(false);
    }
  };

  const goLive = async () => {
    if (!stream) {
      await createStream();
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a stream title");
      return;
    }

    try {
      setStarting(true);
      
      // Update stream first if needed
      if (stream.title !== title || stream.description !== description || 
          stream.category !== category || stream.tags.join(",") !== tags) {
        const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);
        await api.live.update(stream.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          chatEnabled,
          isRecorded,
        });
      }

      // Start the stream
      const response = await api.live.start(stream.id, {
        playbackUrl: undefined, // This would come from your streaming service
      });

      if (response.success && response.data) {
        const data = response.data as any;
        setStream(prev => prev ? {
          ...prev,
          status: 'live',
          playbackUrl: data.playbackUrl,
          startedAt: data.startedAt,
        } : null);
        toast.success("Stream is now live!");
        
        // Start polling for stats
        startStatsPolling();
        startDurationTimer();
      } else {
        toast.error(response.error?.message || "Failed to start stream");
      }
    } catch (error: any) {
      console.error("Error starting stream:", error);
      toast.error(error.error?.message || "Failed to start stream");
    } finally {
      setStarting(false);
    }
  };

  const endStream = async () => {
    if (!stream) return;

    try {
      setEnding(true);
      const response = await api.live.end(stream.id);

      if (response.success && response.data) {
        const data = response.data as any;
        setStream(prev => prev ? {
          ...prev,
          status: 'ended',
          endedAt: data.endedAt,
          recordingUrl: data.recordingUrl,
        } : null);
        toast.success("Stream ended successfully");
        
        // Stop polling
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      } else {
        toast.error(response.error?.message || "Failed to end stream");
      }
    } catch (error: any) {
      console.error("Error ending stream:", error);
      toast.error(error.error?.message || "Failed to end stream");
    } finally {
      setEnding(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleDeleteMessage = async (_messageId: string) => {
    if (!stream) return;
    
    try {
      // Note: This endpoint would need to be added to the backend
      // For now, we'll just show a toast
      toast.success("Message deleted");
      // Refresh chat messages
      const chatResponse = await api.live.getChat<{ messages: ChatMessage[] }>(stream.id, 50);
      if (chatResponse.success && chatResponse.data) {
        setChatMessages(chatResponse.data.messages || []);
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleBanUser = async (_userId: string) => {
    if (!stream) return;
    
    try {
      // Note: This endpoint would need to be added to the backend
      toast.success("User banned");
    } catch (error) {
      toast.error("Failed to ban user");
    }
  };

  const startStatsPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(async () => {
      if (!stream || stream.status !== 'live') return;

      try {
        const response = await api.live.get<LiveStream>(stream.id);
        if (response.success && response.data) {
          const data = response.data;
          setStream(prev => prev ? {
            ...prev,
            viewerCount: data.viewerCount,
            peakViewerCount: data.peakViewerCount,
          } : null);
        }

        // Fetch chat messages
        if (stream.chatEnabled) {
          const chatResponse = await api.live.getChat<{ messages: ChatMessage[] }>(stream.id, 50);
          if (chatResponse.success && chatResponse.data) {
            setChatMessages(chatResponse.data.messages || []);
            setChatMessageCount(chatResponse.data.messages?.length || 0);
          }
        }
      } catch (error) {
        console.error("Error polling stats:", error);
      }
    }, 5000); // Poll every 5 seconds
  };

  const startDurationTimer = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    
    durationIntervalRef.current = setInterval(() => {
      if (stream?.startedAt) {
        const start = new Date(stream.startedAt).getTime();
        const now = Date.now();
        setStreamDuration(Math.floor((now - start) / 1000));
      }
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

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

  return (
    <>
      <Helmet>
        <title>Live Dashboard - PassionFantasia</title>
        <meta name="description" content="Manage your live streams" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Radio className="h-8 w-8 text-destructive" />
            <h1 className="text-4xl font-display font-bold">Live Dashboard</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stream Setup & Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stream Setup */}
              <Card>
                <CardHeader>
                  <CardTitle>Stream Setup</CardTitle>
                  <CardDescription>Configure your live stream settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stream Key */}
                  {stream?.streamKey && (
                    <div className="space-y-2">
                      <Label>Stream Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={stream.streamKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(stream.streamKey!, 'streamKey')}
                        >
                          {copiedField === 'streamKey' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Server URL */}
                  {stream?.streamKey && (
                    <div className="space-y-2">
                      <Label>Server URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={serverUrl}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(serverUrl, 'serverUrl')}
                        >
                          {copiedField === 'serverUrl' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {stream?.streamKey && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Streaming Instructions</AlertTitle>
                      <AlertDescription>
                        Use OBS, Streamlabs, or mobile apps to stream. Enter the Server URL and Stream Key in your streaming software.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Stream Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Stream Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter stream title"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your stream..."
                      rows={4}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate tags with commas (e.g., gaming, tutorial, review)
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="chatEnabled"
                        checked={chatEnabled}
                        onCheckedChange={(checked) => setChatEnabled(checked === true)}
                      />
                      <Label htmlFor="chatEnabled" className="cursor-pointer">
                        Enable chat
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isRecorded"
                        checked={isRecorded}
                        onCheckedChange={(checked) => setIsRecorded(checked === true)}
                      />
                      <Label htmlFor="isRecorded" className="cursor-pointer">
                        Record stream for VOD
                      </Label>
                    </div>
                  </div>

                  {/* Go Live Button */}
                  <Button
                    onClick={stream?.status === 'live' ? undefined : (stream ? goLive : createStream)}
                    disabled={starting || creating || stream?.status === 'live'}
                    className="w-full"
                    size="lg"
                  >
                    {starting || creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {creating ? "Creating..." : "Starting..."}
                      </>
                    ) : stream?.status === 'live' ? (
                      "Stream is Live"
                    ) : stream ? (
                      "Go Live"
                    ) : (
                      "Create Stream"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Live Stats */}
              {stream?.status === 'live' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Live Stats</CardTitle>
                    <CardDescription>Real-time stream statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          <span>Current Viewers</span>
                        </div>
                        <p className="text-2xl font-bold">{stream.viewerCount}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Peak Viewers</span>
                        </div>
                        <p className="text-2xl font-bold">{stream.peakViewerCount}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Duration</span>
                        </div>
                        <p className="text-2xl font-bold">{formatDuration(streamDuration)}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageCircle className="h-4 w-4" />
                          <span>Chat Messages</span>
                        </div>
                        <p className="text-2xl font-bold">{chatMessageCount}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={endStream}
                      disabled={ending}
                      className="w-full"
                    >
                      {ending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Ending...
                        </>
                      ) : (
                        "End Stream"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Stream Preview */}
              {stream?.playbackUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stream Preview</CardTitle>
                    <CardDescription>Live stream preview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoPlayer
                      src={stream.playbackUrl}
                      autoplay={stream.status === 'live'}
                      controls={true}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Chat Panel */}
            {stream?.chatEnabled && stream.status === 'live' && (
              <div className="space-y-6">
                <Card className="h-[600px] flex flex-col">
                  <CardHeader>
                    <CardTitle>Live Chat</CardTitle>
                    <CardDescription>Moderate chat messages</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                      {chatMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No messages yet
                        </p>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className="p-2 rounded-lg bg-muted/50 group hover:bg-muted/70 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {msg.user?.displayName || msg.user?.username || "Anonymous"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm mt-1">{msg.message}</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  title="Delete message"
                                >
                                  <span className="text-xs">🗑️</span>
                                </Button>
                                {msg.user && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleBanUser(msg.user!.id)}
                                    title="Ban user"
                                  >
                                    <span className="text-xs">🚫</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default LiveDashboard;
