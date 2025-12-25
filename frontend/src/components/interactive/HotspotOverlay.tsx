/**
 * Hotspot Overlay Component
 * Clickable hotspots on video for product info, links, etc.
 */

import { X, ShoppingBag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Hotspot {
  id: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
  productId?: string;
  label?: string;
  url?: string;
  description?: string;
}

interface HotspotOverlayProps {
  hotspots: Hotspot[];
  onHotspotClick: (hotspot: Hotspot) => void;
  onClose: () => void;
}

export function HotspotOverlay({
  hotspots,
  onHotspotClick,
  onClose,
}: HotspotOverlayProps) {
  return (
    <>
      {/* Clickable hotspots on video */}
      {hotspots.map((hotspot) => (
        <button
          key={hotspot.id}
          className="absolute z-10 w-8 h-8 rounded-full bg-primary/80 hover:bg-primary border-2 border-white shadow-lg transition-all hover:scale-110"
          style={{
            left: `${hotspot.x}%`,
            top: `${hotspot.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={() => onHotspotClick(hotspot)}
          aria-label={hotspot.label || 'Hotspot'}
        >
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
        </button>
      ))}

      {/* Info card */}
      <Card className="absolute bottom-4 left-4 right-4 max-w-md mx-auto">
        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-sm pr-8">Interactive Hotspots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click on the highlighted spots to learn more
          </p>
          <div className="mt-3 space-y-2">
            {hotspots.map((hotspot) => (
              <Button
                key={hotspot.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onHotspotClick(hotspot)}
              >
                {hotspot.productId ? (
                  <ShoppingBag className="h-4 w-4 mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                {hotspot.label || 'View details'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

