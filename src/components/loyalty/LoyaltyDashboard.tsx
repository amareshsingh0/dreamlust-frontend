import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, TrendingUp, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface LoyaltyStatus {
  points: number;
  tier: string;
  lifetimePoints: number;
  lastActivityAt: string;
  nextTier: string | null;
  pointsToNextTier: number | null;
  tierProgress: number;
}

const tierConfig = {
  bronze: {
    name: 'Bronze',
    color: 'bg-amber-600',
    icon: Trophy,
    gradient: 'from-amber-600 to-amber-800',
  },
  silver: {
    name: 'Silver',
    color: 'bg-gray-400',
    icon: Star,
    gradient: 'from-gray-400 to-gray-600',
  },
  gold: {
    name: 'Gold',
    color: 'bg-yellow-500',
    icon: Star,
    gradient: 'from-yellow-500 to-yellow-700',
  },
  platinum: {
    name: 'Platinum',
    color: 'bg-purple-500',
    icon: Trophy,
    gradient: 'from-purple-500 to-purple-700',
  },
};

export function LoyaltyDashboard() {
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.loyalty.getStatus();
      if (response.success && response.data) {
        setStatus(response.data as LoyaltyStatus);
      }
    } catch (error) {
      console.error('Failed to load loyalty status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to load loyalty status</p>
        </CardContent>
      </Card>
    );
  }

  const tier = tierConfig[status.tier as keyof typeof tierConfig] || tierConfig.bronze;
  const TierIcon = tier.icon;

  return (
    <div className="space-y-6">
      {/* Tier Card */}
      <Card className={cn('overflow-hidden border-0', `bg-gradient-to-br ${tier.gradient}`)}>
        <CardContent className="p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TierIcon className="h-6 w-6" />
                <h3 className="text-2xl font-bold">{tier.name} Member</h3>
              </div>
              <p className="text-white/80 text-sm">Lifetime Points: {status.lifetimePoints.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{status.points.toLocaleString()}</p>
              <p className="text-white/80 text-sm">Available Points</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress to Next Tier */}
      {status.nextTier && status.pointsToNextTier !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress to {tierConfig[status.nextTier as keyof typeof tierConfig]?.name || status.nextTier}</CardTitle>
            <CardDescription>
              {status.pointsToNextTier.toLocaleString()} points needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={status.tierProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round(status.tierProgress)}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Lifetime Points</p>
            </div>
            <p className="text-2xl font-bold">{status.lifetimePoints.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Available Points</p>
            </div>
            <p className="text-2xl font-bold">{status.points.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

