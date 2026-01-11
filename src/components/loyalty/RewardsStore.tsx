import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LoyaltyStatus {
  points: number;
  tier: string;
  lifetimePoints: number;
  lastActivityAt: string;
  nextTier: string | null;
  pointsToNextTier: number | null;
  tierProgress: number;
  tierBenefits: string[];
}

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

const tierConfig = {
  bronze: {
    name: 'Bronze',
    color: 'bg-amber-600',
    icon: Trophy,
    gradient: 'from-amber-600 to-amber-800',
    nextThreshold: 1000,
  },
  silver: {
    name: 'Silver',
    color: 'bg-gray-400',
    icon: Star,
    gradient: 'from-gray-400 to-gray-600',
    nextThreshold: 5000,
  },
  gold: {
    name: 'Gold',
    color: 'bg-yellow-500',
    icon: Star,
    gradient: 'from-yellow-500 to-yellow-700',
    nextThreshold: 20000,
  },
  platinum: {
    name: 'Platinum',
    color: 'bg-purple-500',
    icon: Trophy,
    gradient: 'from-purple-500 to-purple-700',
    nextThreshold: null,
  },
};

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function RewardsStore() {
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusResponse, rewardsResponse] = await Promise.all([
        api.loyalty.getStatus(),
        api.loyalty.getRewards({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        }),
      ]);

      if (statusResponse.success && statusResponse.data) {
        setStatus(statusResponse.data as LoyaltyStatus);
      }

      if (rewardsResponse.success && rewardsResponse.data) {
        setRewards((rewardsResponse.data as any).rewards || []);
      }
    } catch (error) {
      console.error('Failed to load rewards store data:', error);
      toast.error('Failed to load rewards store');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    try {
      const response = await api.loyalty.redeemReward({ rewardId });
      if (response.success) {
        toast.success((response as any).message || 'Reward redeemed successfully!');
        await loadData(); // Reload to update points and rewards
      } else {
        throw new Error(response.error?.message || 'Failed to redeem reward');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to redeem reward');
    } finally {
      setRedeeming(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Unable to load loyalty status</p>
        </CardContent>
      </Card>
    );
  }

  const tier = tierConfig[status.tier as keyof typeof tierConfig] || tierConfig.bronze;
  const TierIcon = tier.icon;
  const nextTierInfo = status.nextTier
    ? tierConfig[status.nextTier as keyof typeof tierConfig]
    : null;
  const _nextTierThreshold = nextTierInfo?.nextThreshold || tier.nextThreshold;

  const categories = [
    { value: 'all', label: 'All Rewards', icon: Gift },
    { value: 'discount', label: 'Discounts', icon: Sparkles },
    { value: 'badge', label: 'Badges', icon: Star },
    { value: 'feature', label: 'Features', icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      {/* User Loyalty Card */}
      <Card className={cn('overflow-hidden border-0', `bg-gradient-to-br ${tier.gradient}`)}>
        <CardContent className="p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TierIcon className="h-8 w-8" />
              <div>
                <h3 className="text-2xl font-bold">{tier.name.toUpperCase()} Member</h3>
                <p className="text-white/80 text-sm">Lifetime Points: {formatNumber(status.lifetimePoints)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{formatNumber(status.points)}</p>
              <p className="text-white/80 text-sm">Available Points</p>
            </div>
          </div>

          {/* Progress Bar */}
          {status.nextTier && status.pointsToNextTier !== null && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/90">
                  {formatNumber(status.pointsToNextTier)} to {nextTierInfo?.name || status.nextTier}
                </span>
                <span className="text-sm text-white/90">
                  {Math.round(status.tierProgress)}%
                </span>
              </div>
              <Progress 
                value={status.tierProgress} 
                className="h-3 bg-white/20"
              />
            </div>
          )}

          {/* Tier Benefits */}
          {status.tierBenefits && status.tierBenefits.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-white/90 mb-2">Tier Benefits:</p>
              <div className="flex flex-wrap gap-2">
                {status.tierBenefits.map((benefit, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-white/20 text-white border-white/30"
                  >
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards Grid */}
      <div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => {
                  const canAfford = status.points >= reward.pointsCost;
                  const isOutOfStock = reward.stock !== null && reward.stock <= 0;
                  const isRedeeming = redeeming === reward.id;

                  return (
                    <Card key={reward.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {reward.imageUrl && (
                        <div className="aspect-video relative overflow-hidden bg-muted">
                          <OptimizedImage
                            src={reward.imageUrl}
                            alt={reward.title}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg flex-1">{reward.title}</CardTitle>
                          <Badge variant="secondary" className="ml-2">
                            {formatNumber(reward.pointsCost)} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{reward.description}</p>
                      </CardHeader>
                      <CardContent>
                        {reward.stock !== null && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {reward.stock > 0 ? `${reward.stock} left` : 'Out of stock'}
                          </p>
                        )}
                        {reward.expiresAt && (
                          <p className="text-xs text-muted-foreground mb-4">
                            Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                        <Button
                          onClick={() => handleRedeem(reward.id)}
                          disabled={!canAfford || isOutOfStock || isRedeeming}
                          className="w-full"
                          variant={canAfford && !isOutOfStock ? 'default' : 'secondary'}
                        >
                          {isRedeeming
                            ? 'Redeeming...'
                            : !canAfford
                            ? `Need ${formatNumber(reward.pointsCost - status.points)} more pts`
                            : isOutOfStock
                            ? 'Out of Stock'
                            : 'Redeem'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

