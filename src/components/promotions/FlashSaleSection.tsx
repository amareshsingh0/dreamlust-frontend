/**
 * Flash Sale Section Component
 * Displays active flash sales in a grid
 */

import { useEffect, useState } from 'react';
import { FlashSaleCard } from './FlashSaleCard';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

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

export function FlashSaleSection() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await api.promotions.getFlashSales<FlashSale[]>();
        if (response.success && response.data) {
          setSales(response.data);
        }
      } catch (error: any) {
        console.error('Failed to fetch flash sales:', error);
        toast({
          title: 'Error',
          description: 'Failed to load flash sales',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSales();

    // Refresh every 30 seconds to update stock and countdown
    const interval = setInterval(fetchSales, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  const handlePurchase = (_saleId: string) => {
    // Refresh sales after purchase
    const fetchSales = async () => {
      try {
        const response = await api.promotions.getFlashSales<FlashSale[]>();
        if (response.success && response.data) {
          setSales(response.data);
        }
      } catch (error) {
        console.error('Failed to refresh flash sales:', error);
      }
    };
    fetchSales();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No active flash sales at the moment</p>
        <p className="text-sm mt-2">Check back soon for exciting deals!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Flash Sales</h2>
          <p className="text-muted-foreground">Limited time offers - Don't miss out!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sales.map((sale) => (
          <FlashSaleCard
            key={sale.id}
            sale={sale}
            onPurchase={handlePurchase}
          />
        ))}
      </div>
    </div>
  );
}

