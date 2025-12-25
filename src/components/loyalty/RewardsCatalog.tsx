import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Sparkles, Tag, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  type: string;
  value: any;
  stock: number | null;
  imageUrl: string | null;
  category: string | null;
  expiresAt: string | null;
}

interface _LoyaltyStatus {
  points: number;
}

export function RewardsCatalog() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
    loadUserPoints();
  }, [selectedCategory]);

  const loadRewards = async () => {
    try {
      const response = await api.loyalty.getRewards({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      if (response.success && response.data) {
        setRewards((response.data as any).rewards || []);
      }
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPoints = async () => {
    try {
      const response = await api.loyalty.getStatus();
      if (response.success && response.data) {
        setUserPoints((response.data as any).points || 0);
      }
    } catch (error) {
      console.error('Failed to load user points:', error);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    try {
      const response = await api.loyalty.redeemReward({ rewardId });
      if (response.success) {
        toast.success((response as any).message || 'Reward redeemed successfully!');
        await loadUserPoints();
        await loadRewards();
      } else {
        throw new Error(response.error?.message || 'Failed to redeem reward');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to redeem reward');
    } finally {
      setRedeeming(null);
    }
  };

  const categories = [
    { value: 'all', label: 'All Rewards', icon: Gift },
    { value: 'discount', label: 'Discounts', icon: Tag },
    { value: 'badge', label: 'Badges', icon: Star },
    { value: 'feature', label: 'Features', icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {cat.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No rewards available in this category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => {
                const canAfford = userPoints >= reward.pointsCost;
                const isOutOfStock = reward.stock !== null && reward.stock <= 0;
                const isRedeeming = redeeming === reward.id;

                return (
                  <Card key={reward.id} className="overflow-hidden">
                    {reward.imageUrl && (
                      <div className="aspect-video relative overflow-hidden">
                        <OptimizedImage
                          src={reward.imageUrl}
                          alt={reward.title}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{reward.title}</CardTitle>
                        <Badge variant="secondary">{reward.pointsCost} pts</Badge>
                      </div>
                      <CardDescription>{reward.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reward.stock !== null && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {reward.stock > 0 ? `${reward.stock} left` : 'Out of stock'}
                        </p>
                      )}
                      {reward.expiresAt && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleRedeem(reward.id)}
                        disabled={!canAfford || isOutOfStock || isRedeeming}
                        className="w-full"
                        variant={canAfford && !isOutOfStock ? 'default' : 'secondary'}
                      >
                        {isRedeeming
                          ? 'Redeeming...'
                          : !canAfford
                          ? `Need ${reward.pointsCost - userPoints} more pts`
                          : isOutOfStock
                          ? 'Out of Stock'
                          : 'Redeem Now'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

