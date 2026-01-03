import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  DollarSign,
  Calendar,
  Loader2,
  LogIn,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

interface MetricValue {
  value: number;
  change: number;
  trend: 'up' | 'down';
}

interface OverviewData {
  timeRange: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalViews: MetricValue;
    totalWatchTime: MetricValue;
    followers: MetricValue;
    earnings: MetricValue;
  };
}

interface ViewsDataPoint {
  date: string;
  views: number;
}

interface TopContentItem {
  id: string;
  title: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  watchTime: number;
}

const Analytics = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [viewsData, setViewsData] = useState<ViewsDataPoint[]>([]);
  const [topContent, setTopContent] = useState<TopContentItem[]>([]);

  // Fetch analytics data
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch all analytics data in parallel
        const [overviewRes, viewsRes, topContentRes] = await Promise.all([
          api.creatorAnalytics.getOverview<OverviewData>({ timeRange }),
          api.creatorAnalytics.getViewsOverTime<{ viewsData: ViewsDataPoint[]; interval: string }>({ timeRange }),
          api.creatorAnalytics.getTopContent<{ topContent: TopContentItem[] }>({ timeRange, limit: 5 }),
        ]);

        if (overviewRes.success && overviewRes.data) {
          setOverview(overviewRes.data);
        }
        if (viewsRes.success && viewsRes.data?.viewsData) {
          setViewsData(viewsRes.data.viewsData);
        }
        if (topContentRes.success && topContentRes.data?.topContent) {
          setTopContent(topContentRes.data.topContent);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, user, timeRange]);

  // Format number with K/M suffix
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format currency in INR
  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Format hours
  const formatHours = (hours: number | undefined | null): string => {
    if (hours === undefined || hours === null) return '0 hrs';
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K hrs`;
    return `${Math.round(hours)} hrs`;
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Show login required page if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <>
        <Helmet>
          <title>Login Required - PassionFantasia</title>
        </Helmet>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <Card className="max-w-md w-full">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-2">Login Required</h1>
                <p className="text-muted-foreground mb-6">
                  You need to be logged in as a creator to view your analytics dashboard.
                  Sign in to track your performance and grow your audience.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="w-full">
                    <Link to="/login">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link to="/signup">
                      Create Account
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </>
    );
  }

  const stats = [
    {
      label: 'Total Views',
      value: overview ? formatNumber(overview.metrics.totalViews.value) : '0',
      change: overview?.metrics.totalViews.change || 0,
      icon: Eye
    },
    {
      label: 'Followers',
      value: overview ? formatNumber(overview.metrics.followers.value) : '0',
      change: overview?.metrics.followers.change || 0,
      icon: Users
    },
    {
      label: 'Revenue',
      value: overview ? formatCurrency(overview.metrics.earnings.value) : '₹0',
      change: overview?.metrics.earnings.change || 0,
      icon: DollarSign
    },
    {
      label: 'Watch Time',
      value: overview ? formatHours(overview.metrics.totalWatchTime.value) : '0 hrs',
      change: overview?.metrics.totalWatchTime.change || 0,
      icon: Calendar
    },
  ];

  return (
    <>
      <Helmet>
        <title>Creator Analytics - PassionFantasia</title>
        <meta name="description" content="Track your performance and grow your audience with PassionFantasia creator analytics." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="font-display text-3xl font-bold">Creator Analytics</h1>
                  <p className="text-muted-foreground">Track your performance and grow your audience</p>
                </div>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {stats.map((stat) => (
                    <Card key={stat.label}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          {stat.label}
                        </div>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        {stat.change !== 0 && (
                          <p className={`text-xs flex items-center gap-1 ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stat.change >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {stat.change >= 0 ? '+' : ''}{stat.change.toFixed(1)}% from last period
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Chart */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Views Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewsData.length > 0 ? (
                      <div className="h-64 flex items-end gap-1">
                        {viewsData.map((point, index) => {
                          const maxViews = Math.max(...viewsData.map(d => d.views), 1);
                          const height = (point.views / maxViews) * 100;
                          return (
                            <div
                              key={index}
                              className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-colors cursor-pointer group relative"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${point.date}: ${formatNumber(point.views)} views`}
                            >
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                                {point.date}: {formatNumber(point.views)} views
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                        <p className="text-muted-foreground">
                          No view data available for this period
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topContent.length > 0 ? (
                      <div className="space-y-4">
                        {topContent.map((content, index) => (
                          <Link
                            key={content.id}
                            to={`/watch/${content.id}`}
                            className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center font-bold text-primary">
                              #{index + 1}
                            </div>
                            {content.thumbnail && (
                              <img
                                src={content.thumbnail}
                                alt={content.title}
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{content.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatNumber(content.viewCount)} views • {formatNumber(content.likeCount)} likes
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-muted-foreground">
                                {formatHours(content.watchTime)}
                              </p>
                              <p className="text-xs text-muted-foreground">watch time</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-muted-foreground">
                          No content data available. Start uploading content to see performance metrics.
                        </p>
                        <Button asChild className="mt-4">
                          <Link to="/upload">Upload Content</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Analytics;
