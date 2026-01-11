import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  Globe,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { DatePicker } from '@/components/ui/DatePicker';

interface AnalyticsStats {
  period: {
    start: string;
    end: string;
  };
  totals: {
    events: number;
    uniqueUsers: number;
    uniqueSessions: number;
  };
  dailyStats: Array<{
    date: string;
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalViews: number;
    totalWatchTime: number;
    avgSessionDuration: number;
    topContent: any;
    topCategories: any;
  }>;
  eventTypeCounts: Array<{
    eventType: string;
    count: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    count: number;
  }>;
  browserBreakdown: Array<{
    browser: string;
    count: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    count: number;
  }>;
}

interface UserStats {
  period: {
    start: string;
    end: string;
  };
  totalEvents: number;
  totalWatchTime: number;
  eventTypeCounts: Array<{
    eventType: string;
    count: number;
  }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    eventData: any;
    timestamp: string;
  }>;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function UserAnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'user'>('overview');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();
  }, [startDate, endDate, activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const response = await (api.analytics as any).getStats({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        });
        if (response.success && response.data) {
          setStats(response.data as AnalyticsStats);
        }
      } else {
        const response = await (api.analytics as any).getUserStats({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        });
        if (response.success && response.data) {
          setUserStats(response.data as UserStats);
        }
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats && !userStats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              placeholder="Select start date"
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              placeholder="Select end date"
              minDate={startDate || undefined}
            />
          </div>
          <Button
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
            }}
            variant="outline"
            className="mt-4"
          >
            Reset to Default (Last 30 Days)
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'user')}>
        <TabsList>
          <TabsTrigger value="overview">Overview Analytics</TabsTrigger>
          <TabsTrigger value="user">My Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Analytics (Admin) */}
        <TabsContent value="overview" className="space-y-6">
          {stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.totals.events)}</div>
                    <p className="text-xs text-muted-foreground">All tracked events</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.totals.uniqueUsers)}</div>
                    <p className="text-xs text-muted-foreground">Active users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.totals.uniqueSessions)}</div>
                    <p className="text-xs text-muted-foreground">Unique sessions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Event Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Types</CardTitle>
                  <CardDescription>Breakdown of events by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.eventTypeCounts.map((item) => (
                      <div key={item.eventType} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.eventType}</span>
                        <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.deviceBreakdown.map((item) => {
                      const Icon = item.device === 'mobile' ? Smartphone : 
                                   item.device === 'tablet' ? Tablet : Monitor;
                      return (
                        <div key={item.device} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium capitalize">{item.device}</span>
                          </div>
                          <Badge>{formatNumber(item.count)}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Browser Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Browsers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.browserBreakdown.map((item) => (
                      <div key={item.browser} className="flex items-center justify-between">
                        <span className="text-sm">{item.browser}</span>
                        <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Country Breakdown */}
              {stats.countryBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Countries</CardTitle>
                    <CardDescription>
                      <Globe className="h-4 w-4 inline mr-2" />
                      Geographic distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.countryBreakdown.map((item) => (
                        <div key={item.country} className="flex items-center justify-between">
                          <span className="text-sm">{item.country}</span>
                          <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daily Stats */}
              {stats.dailyStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Statistics</CardTitle>
                    <CardDescription>Last {stats.dailyStats.length} days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.dailyStats.slice(0, 7).map((day) => (
                        <div key={day.date} className="border-b pb-4 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{new Date(day.date).toLocaleDateString()}</span>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatNumber(day.activeUsers)} active
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(day.totalViews)} views
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No analytics data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* User Analytics */}
        <TabsContent value="user" className="space-y-6">
          {userStats ? (
            <>
              {/* User Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Events</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(userStats.totalEvents)}</div>
                    <p className="text-xs text-muted-foreground">Total events tracked</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(userStats.totalWatchTime)}</div>
                    <p className="text-xs text-muted-foreground">Total time watched</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Activity Types</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats.eventTypeCounts.length}</div>
                    <p className="text-xs text-muted-foreground">Different event types</p>
                  </CardContent>
                </Card>
              </div>

              {/* Event Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>My Activity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userStats.eventTypeCounts.map((item) => (
                      <div key={item.eventType} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.eventType}</span>
                        <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Last 20 events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userStats.recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{event.eventType}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        {event.eventData && Object.keys(event.eventData).length > 0 && (
                          <Badge variant="outline">Has Data</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No user analytics data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

