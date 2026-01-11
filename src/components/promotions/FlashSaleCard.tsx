/**
 * Flash Sale Card Component
 * Displays a flash sale with countdown, pricing, and stock indicator
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CountdownTimer } from './CountdownTimer';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface FlashSale {
  id: string;
  productId?: string;
  productType: string;
  title: string;
  description?: string;
  discountPercent: number;
  stock: number;
  sold: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface FlashSaleCardProps {
  sale: FlashSale;
  productImage?: string;
  productPrice?: number;
  onPurchase?: (saleId: string) => void;
}

export function FlashSaleCard({ sale, productImage, productPrice, onPurchase }: FlashSaleCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);

  const calculateSalePrice = (): number => {
    if (!productPrice) return 0;
    return productPrice * (1 - sale.discountPercent / 100);
  };

  const stockLeft = sale.stock - sale.sold;
  const stockPercentage = (sale.sold / sale.stock) * 100;
  const isSoldOut = stockLeft <= 0;

  const handlePurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isSoldOut) {
      toast({
        title: 'Sold Out',
        description: 'This flash sale is sold out',
        variant: 'destructive',
      });
      return;
    }

    setPurchasing(true);
    try {
      const response = await api.promotions.purchaseFlashSale(sale.id);
      if (response.success) {
        toast({
          title: 'Success!',
          description: 'Purchase successful',
        });
        if (onPurchase) {
          onPurchase(sale.id);
        }
      } else {
        throw new Error(response.error?.message || 'Purchase failed');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete purchase',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="destructive" className="text-sm font-bold">
          -{sale.discountPercent}%
        </Badge>
      </div>

      {productImage && (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <OptimizedImage
            src={productImage}
            alt={sale.title}
            className="w-full h-full object-cover"
            width={400}
            height={225}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <CardHeader>
        <CardTitle className="line-clamp-2">{sale.title}</CardTitle>
        {sale.description && (
          <CardDescription className="line-clamp-2">{sale.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Countdown Timer */}
        <CountdownTimer endTime={sale.endTime} />

        {/* Price Display */}
        {productPrice && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">₹{calculateSalePrice().toFixed(2)}</span>
            <span className="text-sm text-muted-foreground line-through">
              ₹{productPrice.toFixed(2)}
            </span>
            <span className="text-sm text-primary font-medium">
              Save ₹{(productPrice - calculateSalePrice()).toFixed(2)}
            </span>
          </div>
        )}

        {/* Stock Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stock Left</span>
            <span className={isSoldOut ? 'text-destructive font-semibold' : 'font-semibold'}>
              {isSoldOut ? 'Sold Out' : `${stockLeft} left`}
            </span>
          </div>
          <Progress value={stockPercentage} className="h-2" />
        </div>

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={isSoldOut || purchasing}
          className="w-full"
          size="lg"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {purchasing ? 'Processing...' : isSoldOut ? 'Sold Out' : 'Buy Now'}
        </Button>
      </CardContent>
    </Card>
  );
}

