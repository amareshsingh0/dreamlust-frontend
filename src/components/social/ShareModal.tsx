/**
 * Share Modal Component
 * Social sharing with Open Graph support
 */

import { useState, useEffect } from 'react';
import { Share2, Copy, Check, Twitter, Facebook, MessageCircle, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentTitle?: string;
  contentDescription?: string;
}

export function ShareModal({
  open,
  onOpenChange,
  contentId,
  contentTitle,
  contentDescription,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && contentId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/watch/${contentId}`;
      setShareUrl(url);

      // Fetch embed code
      (api as any).get(`/social/share/${contentId}/embed`)
        .then((response: any) => {
          if (response.data.success) {
            setEmbedCode(response.data.data.embedCode);
          }
        })
        .catch((error: any) => {
          console.error('Failed to fetch embed code:', error);
        });
    }
  }, [open, contentId]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: contentTitle || 'Check this out',
          text: contentDescription || '',
          url: shareUrl,
        });
        await trackShare();
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Share was cancelled or failed
        }
      }
    }
  };

  const handlePlatformShare = async (platform: string) => {
    try {
      const response = await (api as any).get(`/social/share/${contentId}/url?platform=${platform}`);
      if (response.data.success) {
        window.open(response.data.data.url, '_blank', 'noopener,noreferrer');
        await trackShare(platform);
      }
    } catch {
      // Failed to share on platform
    }
  };

  const trackShare = async (platform?: string) => {
    try {
      await (api as any).post(`/social/share/${contentId}/track`, { platform });
    } catch {
      // Silent fail
    }
  };

  const platforms = [
    { name: 'Twitter', icon: Twitter, color: 'bg-blue-500' },
    { name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { name: 'Reddit', icon: MessageCircle, color: 'bg-orange-500' },
    { name: 'WhatsApp', icon: Send, color: 'bg-green-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this video</DialogTitle>
          <DialogDescription>
            Share this content with your friends and followers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Native Share */}
          {'share' in navigator && (
            <Button
              onClick={handleNativeShare}
              className="w-full"
              variant="default"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share via...
            </Button>
          )}

          {/* Social Platform Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((platform) => (
              <Button
                key={platform.name}
                onClick={() => handlePlatformShare(platform.name.toLowerCase())}
                variant="outline"
                className="flex items-center gap-2"
              >
                <platform.icon className="h-4 w-4" />
                {platform.name}
              </Button>
            ))}
          </div>

          {/* Embed Code */}
          {embedCode && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Embed Code</h4>
              <div className="flex gap-2">
                <Input
                  value={embedCode}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleCopy(embedCode)}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Direct Link */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Direct Link</h4>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly />
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleCopy(shareUrl)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

