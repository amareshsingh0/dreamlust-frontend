import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeRangeSelector } from './TimeRangeSelector';
import { MetricCard } from './MetricCard';
import { LineChart } from './charts/LineChart';
import { BarChart } from './charts/BarChart';
import { PieChart } from './charts/PieChart';
import { DataTable } from './DataTable';
import { api } from '@/lib/api';
import { Eye, Clock, Users, DollarSign } from 'lucide-react';

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

export function CreatorAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [viewsData, setViewsData] = useState<any[]>([]);
  const [topContent, setTopContent] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>(null);
  const [contentPerformance, setContentPerformance] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        viewsRes,
        topContentRes,
        trafficRes,
        audienceRes,
        performanceRes,
      ] = await Promise.all([
        api.creatorAnalytics.getOverview({ timeRange }),
        api.creatorAnalytics.getViewsOverTime({ timeRange }),
        api.creatorAnalytics.getTopContent({ timeRange, limit: 10 }),
        api.creatorAnalytics.getTrafficSources({ timeRange }),
        api.creatorAnalytics.getAudience({ timeRange }),
        api.creatorAnalytics.getContentPerformance({ timeRange, limit: 20 }),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (viewsRes.success) setViewsData((viewsRes.data as any)?.viewsData || []);
      if (topContentRes.success) setTopContent((topContentRes.data as any)?.topContent || []);
      if (trafficRes.success) {
        const sources = (trafficRes.data as any)?.trafficSources || [];
        setTrafficSources(
          sources.map((s: any) => ({ name: s.source, value: s.count }))
        );
      }
      if (audienceRes.success) setAudience(audienceRes.data);
      if (performanceRes.success) {
        setContentPerformance((performanceRes.data as any)?.contentStats || []);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = overview?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Time Range</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeRangeSelector
            value={timeRange}
            options={['7d', '30d', '90d', '1y', 'all']}
            onChange={setTimeRange}
          />
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Views"
          value={formatNumber(metrics.totalViews?.value || 0)}
          change={metrics.totalViews?.change}
          trend={metrics.totalViews?.trend}
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Watch Time"
          value={formatDuration(metrics.totalWatchTime?.value || 0)}
          change={metrics.totalWatchTime?.change}
          trend={metrics.totalWatchTime?.trend}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Followers"
          value={formatNumber(metrics.followers?.value || 0)}
          change={metrics.followers?.change}
          trend={metrics.followers?.trend}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Earnings"
          value={`₹${Number(metrics.earnings?.value || 0).toFixed(0)}`}
          change={metrics.earnings?.change}
          trend={metrics.earnings?.trend}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="Views Over Time"
          data={viewsData}
          xAxis="date"
          yAxis="views"
        />
        <BarChart
          title="Top Performing Content"
          data={topContent.map((item) => ({
            title: item.title?.substring(0, 30) || 'Untitled',
            views: item.views || 0,
          }))}
          xAxis="title"
          yAxis="views"
        />
        <PieChart
          title="Traffic Sources"
          data={trafficSources}
        />
        {audience?.viewersByDevice && (
          <BarChart
            title="Viewers by Device"
            data={audience.viewersByDevice.map((item: any) => ({
              device: item.device,
              count: item.count,
            }))}
            xAxis="device"
            yAxis="count"
          />
        )}
      </div>

      {/* Audience Insights */}
      {audience && (
        <Card>
          <CardHeader>
            <CardTitle>Audience Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {audience.viewersByCountry && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Viewers by Country</h3>
                <BarChart
                  title=""
                  data={audience.viewersByCountry.map((item: any) => ({
                    country: item.country,
                    count: item.count,
                  }))}
                  xAxis="country"
                  yAxis="count"
                />
              </div>
            )}
            {audience.viewersByDevice && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Viewers by Device</h3>
                <BarChart
                  title=""
                  data={audience.viewersByDevice.map((item: any) => ({
                    device: item.device,
                    count: item.count,
                  }))}
                  xAxis="device"
                  yAxis="count"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Performance */}
      <DataTable
        columns={['Content', 'Views', 'Watch Time', 'Engagement', 'Revenue']}
        data={contentPerformance.map((item) => ({
          content: item.title || 'Untitled',
          views: formatNumber(item.views || 0),
          watchtime: formatDuration(item.watchTime || 0),
          engagement: item.engagement || '0%',
          revenue: `₹${Number(item.revenue || 0).toFixed(0)}`,
        }))}
        sortable
        searchable
      />
    </div>
  );
}

