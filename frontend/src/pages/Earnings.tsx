import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Gift,
  CreditCard,
  Download,
  ArrowUpRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EarningsData {
  summary: {
    totalEarnings: number;
    tipsTotal: number;
    subscriptionsTotal: number;
    tipsCount: number;
    subscriptionsCount: number;
  };
  tips: Array<{
    id: string;
    amount: number;
    currency: string;
    message?: string;
    isAnonymous: boolean;
    createdAt: string;
    fromUser?: {
      id: string;
      username: string;
      displayName: string;
      avatar?: string;
    } | null;
  }>;
  subscriptions: Array<{
    id: string;
    amount: number;
    currency: string;
    tier: string;
    startedAt: string;
    subscriber: {
      id: string;
      username: string;
      displayName: string;
      avatar?: string;
    };
  }>;
  monthlyEarnings: Array<{
    month: string;
    amount: number;
  }>;
}

interface EarningsStats {
  today: { amount: number; count: number };
  week: { amount: number; count: number };
  month: { amount: number; count: number };
  year: { amount: number; count: number };
}

export default function Earnings() {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tips' | 'subscriptions'>('overview');

  useEffect(() => {
    loadEarnings();
    loadStats();
  }, []);

  const loadEarnings = async () => {
    try {
      const response = await api.earnings.get<EarningsData>();
      if (response.success && response.data) {
        setEarnings(response.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to load earnings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.earnings.getStats<EarningsStats>();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading earnings...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Earnings Dashboard - PassionFantasia</title>
        <meta name="description" content="View your earnings, tips, and revenue statistics" />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 flex items-center gap-3">
                  <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  Earnings Dashboard
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Track your tips, subscriptions, and revenue
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {formatCurrency(stats.today.amount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.today.count} tips</p>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-accent">
                      {formatCurrency(stats.week.amount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.week.count} tips</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(stats.month.amount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.month.count} tips</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">This Year</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(stats.year.amount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.year.count} tips</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Summary Card */}
            {earnings && (
              <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    Total Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                        {formatCurrency(earnings.summary.totalEarnings)}
                      </div>
                      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base">
                        <div>
                          <span className="text-muted-foreground">Tips: </span>
                          <span className="font-semibold">{formatCurrency(earnings.summary.tipsTotal)}</span>
                          <span className="text-muted-foreground ml-1">({earnings.summary.tipsCount})</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subscriptions: </span>
                          <span className="font-semibold">{formatCurrency(earnings.summary.subscriptionsTotal)}</span>
                          <span className="text-muted-foreground ml-1">({earnings.summary.subscriptionsCount})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tips" className="gap-2">
                  <Gift className="h-4 w-4" />
                  Tips ({earnings?.summary.tipsCount || 0})
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Subscriptions ({earnings?.summary.subscriptionsCount || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Monthly Earnings Chart */}
                {earnings && earnings.monthlyEarnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Monthly Earnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {earnings.monthlyEarnings.slice(-12).reverse().map((item) => (
                          <div key={item.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <span className="font-medium text-sm sm:text-base">{formatMonth(item.month)}</span>
                            <span className="font-bold text-primary text-base sm:text-lg">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Tips */}
                {earnings && earnings.tips.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Recent Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {earnings.tips.slice(0, 5).map((tip) => (
                          <div key={tip.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {tip.isAnonymous ? (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-lg">?</span>
                                </div>
                              ) : (
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={tip.fromUser?.avatar} />
                                  <AvatarFallback>
                                    {tip.fromUser?.displayName?.[0] || tip.fromUser?.username?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base truncate">
                                  {tip.isAnonymous ? 'Anonymous Supporter' : tip.fromUser?.displayName || tip.fromUser?.username || 'User'}
                                </p>
                                {tip.message && (
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                                    "{tip.message}"
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(tip.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-lg sm:text-xl text-primary">
                                {formatCurrency(tip.amount, tip.currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tips" className="space-y-4">
                {earnings && earnings.tips.length > 0 ? (
                  <div className="space-y-3">
                    {earnings.tips.map((tip) => (
                      <Card key={tip.id} className="hover:border-primary/30 transition-all">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              {tip.isAnonymous ? (
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-xl sm:text-2xl">?</span>
                                </div>
                              ) : (
                                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                                  <AvatarImage src={tip.fromUser?.avatar} />
                                  <AvatarFallback>
                                    {tip.fromUser?.displayName?.[0] || tip.fromUser?.username?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-base sm:text-lg truncate">
                                  {tip.isAnonymous ? 'Anonymous Supporter' : tip.fromUser?.displayName || tip.fromUser?.username || 'User'}
                                </p>
                                {tip.message && (
                                  <p className="text-sm sm:text-base text-muted-foreground mt-1 line-clamp-2">
                                    "{tip.message}"
                                  </p>
                                )}
                                <p className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(tip.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-extrabold text-xl sm:text-2xl lg:text-3xl text-primary">
                                {formatCurrency(tip.amount, tip.currency)}
                              </p>
                              <ArrowUpRight className="h-4 w-4 text-green-500 mx-auto mt-1" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No tips received yet</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4">
                {earnings && earnings.subscriptions.length > 0 ? (
                  <div className="space-y-3">
                    {earnings.subscriptions.map((sub) => (
                      <Card key={sub.id} className="hover:border-primary/30 transition-all">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                                <AvatarImage src={sub.subscriber.avatar} />
                                <AvatarFallback>
                                  {sub.subscriber.displayName?.[0] || sub.subscriber.username?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-base sm:text-lg truncate">
                                  {sub.subscriber.displayName || sub.subscriber.username}
                                </p>
                                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                  {sub.tier} Tier Subscription
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Started {formatDistanceToNow(new Date(sub.startedAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-extrabold text-xl sm:text-2xl lg:text-3xl text-primary">
                                {formatCurrency(sub.amount, sub.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">per month</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No active subscriptions</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </>
  );
}

