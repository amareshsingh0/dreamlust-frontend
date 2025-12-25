/**
 * Download Manager Component
 * Manages offline content downloads
 */

import { useState, useEffect, useCallback } from 'react';
import { Download, X, Play, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface DownloadItem {
  id: string;
  contentId: string;
  quality: string;
  fileSize: bigint | number | null;
  expiresAt: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'expired' | 'cancelled';
  progress: number;
  error?: string;
  content: {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    creator: {
      display_name: string;
      handle: string;
    };
  };
}

export function DownloadManager() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const loadDownloads = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await api.downloads.get<{ data: DownloadItem[] }>({ limit: 100 });
      if (response.success && response.data) {
        setDownloads((response.data as any).data || response.data as unknown as DownloadItem[]);
      }
    } catch {
      // Failed to load downloads
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDownloads();
    }
  }, [user, loadDownloads]);

  // Setup Socket.io for real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    
    // Listen for download progress updates
    socket.on('download:progress', (data: { downloadId: string; progress: number }) => {
      setDownloads(prev => prev.map(d => 
        d.id === data.downloadId 
          ? { ...d, progress: data.progress, status: 'downloading' as const }
          : d
      ));
    });

    // Listen for download completion
    socket.on('download:completed', (data: { downloadId: string }) => {
      setDownloads(prev => prev.map(d => 
        d.id === data.downloadId 
          ? { ...d, status: 'completed' as const, progress: 100 }
          : d
      ));
      toast.success('Download completed!');
      loadDownloads(); // Refresh list
    });

    // Listen for download failures
    socket.on('download:failed', (data: { downloadId: string; error: string }) => {
      setDownloads(prev => prev.map(d => 
        d.id === data.downloadId 
          ? { ...d, status: 'failed' as const, error: data.error }
          : d
      ));
      toast.error(`Download failed: ${data.error}`);
    });

    return () => {
      socket.off('download:progress');
      socket.off('download:completed');
      socket.off('download:failed');
    };
  }, [user, loadDownloads]);

  // Polling fallback (if socket.io not available)
  useEffect(() => {
    if (!user) return;

    const hasActive = downloads.some(d => d.status === 'downloading' || d.status === 'pending');
    
    if (hasActive) {
      const interval = setInterval(() => {
        loadDownloads();
      }, 5000); // Poll every 5 seconds for active downloads

      return () => clearInterval(interval);
    }
  }, [downloads, user, loadDownloads]);


  const handleCancel = async (downloadId: string) => {
    try {
      await (api as any).delete(`/downloads/${downloadId}?action=cancel`);
      toast.success('Download cancelled');
      loadDownloads();
    } catch {
      toast.error('Failed to cancel download');
    }
  };

  const handleDelete = async (downloadId: string) => {
    try {
      await (api as any).delete(`/downloads/${downloadId}?action=delete`);
      toast.success('Download deleted');
      loadDownloads();
    } catch {
      toast.error('Failed to delete download');
    }
  };

  const handlePlay = async (downloadId: string) => {
    try {
      const response = await (api as any).get(`/downloads/${downloadId}/url`);
      if (response.data.success) {
        window.location.href = `/watch/${downloadId}?offline=true`;
      }
    } catch {
      toast.error('Failed to load download');
    }
  };

  const formatFileSize = (bytes: bigint | number | null): string => {
    if (!bytes) return 'Unknown size';
    const numBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    if (numBytes < 1024 * 1024 * 1024) return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(numBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'downloading':
        return <Badge variant="default" className="bg-blue-500">Downloading</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const activeDownloads = downloads.filter(
    d => d.status === 'pending' || d.status === 'downloading'
  );
  const completedDownloads = downloads.filter(d => d.status === 'completed');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading downloads...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isMobile ? 'mb-20' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Downloads
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active ({activeDownloads.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedDownloads.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {activeDownloads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active downloads
              </div>
            ) : (
              <div className="space-y-4">
                {activeDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    {download.content.thumbnail && (
                      <img
                        src={download.content.thumbnail}
                        alt={download.content.title}
                        className="w-24 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{download.content.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {download.content.creator.display_name}
                      </p>
                      <div className="mt-2 space-y-2">
                        {download.status === 'downloading' && (
                          <Progress value={download.progress} className="h-2" />
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {download.progress}% • {formatFileSize(download.fileSize)}
                          </span>
                          {getStatusBadge(download.status)}
                        </div>
                        {download.error && (
                          <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>{download.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancel(download.id)}
                      disabled={download.status === 'completed'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedDownloads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed downloads
              </div>
            ) : (
              <div className="space-y-4">
                {completedDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    {download.content.thumbnail && (
                      <img
                        src={download.content.thumbnail}
                        alt={download.content.title}
                        className="w-24 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{download.content.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {download.content.creator.display_name}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Expires: {formatDistanceToNow(new Date(download.expiresAt), { addSuffix: true })}
                        </span>
                        {getStatusBadge(download.status)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePlay(download.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(download.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

