import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Banner {
  size: string;
  name: string;
  url: string;
  html: string;
}

// Define the API response type
interface GetBannersResponse {
  success: boolean;
  data: {
    banners: Banner[];
  };
}

interface BannerDownloadsProps {
  sizes: string[];
}

export function BannerDownloads({ sizes }: BannerDownloadsProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await api.affiliates.getBanners() as GetBannersResponse;
      if (response.success && response.data) {
        // Filter by requested sizes
        const filtered = (response.data.banners || []).filter((b: Banner) =>
          sizes.includes(b.size)
        );
        setBanners(filtered);
      }
    } catch (error) {
      console.error('Failed to load banners:', error);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const downloadBanner = async (url: string, size: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `affiliate-banner-${size}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Banner downloaded!');
    } catch (error) {
      toast.error('Failed to download banner');
    }
  };

  const copyEmbedCode = (html: string, index: number) => {
    navigator.clipboard.writeText(html);
    setCopiedIndex(index);
    toast.success('Embed code copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return <div>Loading banners...</div>;
  }

  if (banners.length === 0) {
    return <div>No banners available for the selected sizes.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {banners.map((banner, index) => (
        <Card key={banner.size}>
          <CardHeader>
            <CardTitle className="text-sm">{banner.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{banner.size}px</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center min-h-[100px]">
              <img
                src={banner.url}
                alt={`Affiliate banner ${banner.size}`}
                className="max-w-full max-h-24 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<p class="text-xs text-muted-foreground">Preview not available</p>';
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => downloadBanner(banner.url, banner.size)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyEmbedCode(banner.html, index)}
              >
                {copiedIndex === index ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
