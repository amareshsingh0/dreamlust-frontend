/**
 * Subscription Manager Component
 * Main component for managing subscriptions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsageStats } from './UsageStats';
import { CancellationFlow } from './CancellationFlow';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowUp, Pause, X, Calendar, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
}

interface UsageStats {
  videosWatched: number;
  hoursWatched: number;
  downloads: number;
}

interface SubscriptionData {
  subscription: Subscription;
  usageStats: UsageStats;
}

const PLAN_PRICES: Record<string, number> = {
  basic: 299,
  premium: 599,
  creator: 999,
};

const PLAN_NAMES: Record<string, string> = {
  basic: 'Basic',
  premium: 'Premium',
  creator: 'Creator',
};

export function SubscriptionManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [showCancellation, setShowCancellation] = useState(false);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await api.subscriptionManagement.getCurrent<SubscriptionData>();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // TODO: Implement upgrade flow
    toast({
      title: 'Upgrade',
      description: 'Upgrade functionality coming soon',
    });
  };

  const handlePause = async () => {
    if (!data?.subscription) return;

    // Calculate resume date (3 months from now)
    const resumeAt = new Date();
    resumeAt.setMonth(resumeAt.getMonth() + 3);

    setPausing(true);
    try {
      const response = await api.subscriptionManagement.pause({
        subscriptionId: data.subscription.id,
        resumeAt: resumeAt.toISOString(),
        reason: 'User requested pause',
      });

      if (response.success) {
        toast({
          title: 'Subscription Paused',
          description: 'Your subscription has been paused successfully',
        });
        loadSubscription();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to pause subscription',
        variant: 'destructive',
      });
    } finally {
      setPausing(false);
    }
  };

  const handleCancelComplete = () => {
    setShowCancellation(false);
    loadSubscription();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data || !data.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>You don't have an active subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = '/premium'}>
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { subscription, usageStats } = data;
  const planPrice = PLAN_PRICES[subscription.plan] || 0;
  const planName = PLAN_NAMES[subscription.plan] || subscription.plan;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
              {subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{planName}</h3>
            <p className="text-muted-foreground">₹{planPrice}/month</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Next Billing Date
              </div>
              <p className="font-semibold">
                {subscription.current_period_end
                  ? format(new Date(subscription.current_period_end), 'MMM dd, yyyy')
                  : 'N/A'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                Billing Amount
              </div>
              <p className="font-semibold">₹{planPrice}</p>
            </div>
          </div>

          {subscription.cancel_at_period_end && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              Your subscription will be canceled on{' '}
              {subscription.current_period_end
                ? format(new Date(subscription.current_period_end), 'MMM dd, yyyy')
                : 'the end of the current period'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <UsageStats
        videosWatched={usageStats.videosWatched}
        hoursWatched={usageStats.hoursWatched}
        downloads={usageStats.downloads}
        planPrice={planPrice}
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleUpgrade}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button variant="outline" onClick={handlePause} disabled={pausing || subscription.status !== 'active'}>
              <Pause className="h-4 w-4 mr-2" />
              {pausing ? 'Pausing...' : 'Pause Subscription'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCancellation(true)}
              disabled={subscription.cancel_at_period_end}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Dialog */}
      <Dialog open={showCancellation} onOpenChange={setShowCancellation}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <CancellationFlow
            subscriptionId={subscription.id}
            planPrice={planPrice}
            onCancel={handleCancelComplete}
            onClose={() => setShowCancellation(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

