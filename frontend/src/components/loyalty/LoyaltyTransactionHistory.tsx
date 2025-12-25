import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Clock, Gift, TrendingUp, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  type: 'earned' | 'redeemed';
  points: number;
  reason: string;
  metadata: any;
  createdAt: string;
}

const reasonLabels: Record<string, string> = {
  watch_time: 'Watch Time',
  referral: 'Referral Bonus',
  daily_login: 'Daily Login',
  purchase: 'Purchase',
  reward_redemption: 'Reward Redemption',
  content_upload: 'Content Upload',
  subscription: 'Subscription',
  tip: 'Tip Received',
};

const reasonIcons: Record<string, any> = {
  watch_time: Clock,
  referral: TrendingUp,
  daily_login: Gift,
  purchase: ShoppingBag,
  reward_redemption: Gift,
  content_upload: TrendingUp,
  subscription: ShoppingBag,
  tip: Gift,
};

export function LoyaltyTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [page]);

  const loadTransactions = async () => {
    try {
      const response = await api.loyalty.getTransactions({ page, limit: 20 });
      if (response.success && response.data) {
        const data = response.data as any;
        setTransactions(data.transactions || []);
        setHasMore(data.pagination?.page < data.pagination?.pages);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start earning points by watching content, referring friends, and more!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => {
        const isEarned = transaction.type === 'earned';
        const ReasonIcon = reasonIcons[transaction.reason] || Gift;
        const reasonLabel = reasonLabels[transaction.reason] || transaction.reason;

        return (
          <Card key={transaction.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-full',
                      isEarned ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                    )}
                  >
                    {isEarned ? (
                      <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <ReasonIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{reasonLabel}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                    </p>
                    {transaction.metadata?.rewardTitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.metadata.rewardTitle}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      isEarned ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {isEarned ? '+' : '-'}
                    {Math.abs(transaction.points).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

