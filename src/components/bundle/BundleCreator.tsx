import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ContentGrid } from '@/components/content/ContentGrid';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Content } from '@/types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface BundleCreatorProps {
  myContent?: Content[];
  onBundleCreated?: () => void;
}

export function BundleCreator({ myContent = [], onBundleCreated }: BundleCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [price, setPrice] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Calculate individual price (sum of all selected content prices)
  const calculateIndividualPrice = useMemo(() => {
    return selectedContent.reduce((total, contentId) => {
      const content = myContent.find(c => c.id === contentId);
      if (content?.isPremium && (content as any).price) {
        return total + parseFloat((content as any).price) || 0;
      }
      return total;
    }, 0);
  }, [selectedContent, myContent]);

  // Calculate discount percentage
  const calculateDiscount = useMemo(() => {
    const individualPrice = calculateIndividualPrice;
    const bundlePrice = parseFloat(price) || 0;
    if (individualPrice === 0 || bundlePrice === 0) return 0;
    return Math.round(((individualPrice - bundlePrice) / individualPrice) * 100);
  }, [calculateIndividualPrice, price]);

  const toggleContent = (contentId: string) => {
    setSelectedContent(prev => 
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const createBundle = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a bundle title');
      return;
    }

    if (selectedContent.length === 0) {
      toast.error('Please select at least one content item');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid bundle price');
      return;
    }

    setIsCreating(true);

    try {
      const bundleData = {
        title: title.trim(),
        description: description.trim(),
        thumbnail: thumbnail ? undefined : undefined, // File upload handled separately
        contentIds: selectedContent,
        price: parseFloat(price),
        expiresAt: expiresAt?.toISOString() || null,
      };

      const response = await api.bundles.create(bundleData as any);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create bundle');
      }

      toast.success('Bundle created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setThumbnail(null);
      setSelectedContent([]);
      setPrice('');
      setExpiresAt(null);

      onBundleCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create bundle');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Bundle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bundle Title */}
          <div className="space-y-2">
            <Label htmlFor="bundle-title">Bundle Title</Label>
            <Input
              id="bundle-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter bundle title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="bundle-description">Description</Label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your bundle"
              rows={4}
            />
          </div>

          {/* Thumbnail Upload */}
          <ImageUpload
            label="Thumbnail"
            value={thumbnail}
            onChange={setThumbnail}
          />
        </CardContent>
      </Card>

      {/* Content Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Content for Bundle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myContent.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No content available. Upload some content first.
            </p>
          ) : (
            <>
              <ContentGrid
                content={myContent}
                selectable
                selected={selectedContent}
                onToggle={toggleContent}
                columns={4}
              />
              <p className="text-sm text-muted-foreground">
                {selectedContent.length} {selectedContent.length === 1 ? 'item' : 'items'} selected
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Individual Price</p>
            <p className="text-lg font-semibold">
              ₹{calculateIndividualPrice.toFixed(0)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bundle-price">Bundle Price</Label>
            <Input
              id="bundle-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {calculateDiscount > 0 && (
            <p className="text-sm text-green-600 font-medium">
              Discount: {calculateDiscount}% off
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expiration Date */}
      <Card>
        <CardContent className="pt-6">
          <DatePicker
            label="Expiration Date (optional)"
            value={expiresAt}
            onChange={setExpiresAt}
            placeholder="Select expiration date"
            minDate={new Date()}
          />
        </CardContent>
      </Card>

      {/* Create Button */}
      <Button
        onClick={createBundle}
        disabled={isCreating || selectedContent.length === 0}
        className="w-full"
        size="lg"
      >
        {isCreating ? 'Creating Bundle...' : 'Create Bundle'}
      </Button>
    </div>
  );
}

