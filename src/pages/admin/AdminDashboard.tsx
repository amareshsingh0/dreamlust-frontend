import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Link, useLocation } from 'react-router-dom';
import { DashboardChart } from '@/components/admin/DashboardChart';
import { connectAdminSocket, subscribeToAdminEvents, disconnectAdminSocket } from '@/lib/websocket/adminSocket';
import {
  LayoutDashboard,
  Users,
  FileVideo,
  Shield,
  BarChart3,
  DollarSign,
  Settings,
  TrendingUp,
  AlertTriangle,
  Activity,
  UserPlus,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  weeklyViews: number;
  monthlyRevenue: number;
  pendingReports: number;
  totalCreators: number;
  userGrowth: string;
}

interface ChartData {
  userGrowth: Array<{ date: string; value: number }>;
  revenue: Array<{ date: string; value: number }>;
  categories: Array<{ name: string; count: number }>;
}

interface ActivityItem {
  type: 'report' | 'content' | 'user';
  id: string;
  title: string;
  description: string;
  user: string;
  timestamp: string;
}

const sidebarItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/content', label: 'Content', icon: FileVideo },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/creators', label: 'Creators', icon: UserPlus },
  { href: '/admin/reports', label: 'Reports', icon: Shield },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function StatCard({
  title,
  value,
  change,
  urgent,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change?: string;
  urgent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {title}
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', urgent && 'text-destructive')}>
          {value}
        </div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3 w-3 inline mr-1" />
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadDashboardData();

    // Connect to WebSocket for real-time updates
    connectAdminSocket(
      () => {
        console.log('Admin WebSocket connected');
      },
      () => {
        console.log('Admin WebSocket disconnected');
      },
      (error) => {
        console.error('Admin WebSocket error:', error);
      }
    );

    // Subscribe to real-time events
    const unsubscribe = subscribeToAdminEvents({
      'admin:new_upload': (data) => {
        toast({
          title: 'New Upload',
          description: `New content uploaded: ${data.contentId}`,
        });
        loadDashboardData(); // Refresh stats
      },
      'admin:moderation_result': (data) => {
        toast({
          title: 'Moderation Result',
          description: `Content ${data.contentId} moderation: ${data.result.status}`,
        });
        loadDashboardData(); // Refresh stats
      },
      'admin:stats_update': (data) => {
        if (data.stats) {
          setStats(data.stats);
        }
      },
      'admin:new_report': (_data) => {
        toast({
          title: 'New Report',
          description: 'A new report has been submitted',
          variant: 'destructive',
        });
        loadDashboardData(); // Refresh stats
      },
    });

    return () => {
      unsubscribe();
      disconnectAdminSocket();
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, chartsRes, activityRes] = await Promise.all([
        api.admin.getDashboardStats(),
        api.admin.getDashboardCharts({ period: '30d' }),
        api.admin.getDashboardActivity({ limit: 10 }),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as DashboardStats);
      }

      if (chartsRes.success && chartsRes.data) {
        setChartData(chartsRes.data as ChartData);
      }

      if (activityRes.success && activityRes.data) {
        setRecentActivity(activityRes.data as ActivityItem[]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - PassionFantasia</title>
        <meta name="description" content="Admin dashboard" />
      </Helmet>

      <Layout>
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-card p-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Admin Panel</h2>
            </div>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={location.pathname === item.href}
                />
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                  Overview of platform statistics and activity
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">Loading dashboard data...</div>
              ) : (
                <>
                  {/* Stats Grid */}
                  {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                      <StatCard
                        title="Total Users"
                        value={stats.totalUsers}
                        change={stats.userGrowth}
                        icon={Users}
                      />
                      <StatCard
                        title="Active Users (24h)"
                        value={stats.activeUsers}
                        icon={Activity}
                      />
                      <StatCard
                        title="Total Content"
                        value={stats.totalContent}
                        icon={FileVideo}
                      />
                      <StatCard
                        title="Total Views (7d)"
                        value={stats.weeklyViews.toLocaleString()}
                        icon={Eye}
                      />
                      <StatCard
                        title="Revenue (30d)"
                        value={`₹${stats.monthlyRevenue.toLocaleString()}`}
                        icon={DollarSign}
                      />
                      <StatCard
                        title="Pending Reports"
                        value={stats.pendingReports}
                        urgent={stats.pendingReports > 0}
                        icon={AlertTriangle}
                      />
                    </div>
                  )}

                  {/* Charts Section */}
                  {chartData && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <DashboardChart
                        type="line"
                        title="User Growth"
                        description="New users over time"
                        data={chartData.userGrowth}
                        label="New Users"
                        color="#3b82f6"
                      />
                      <DashboardChart
                        type="line"
                        title="Revenue Trend"
                        description="Revenue over time"
                        data={chartData.revenue}
                        label="Revenue (₹)"
                        color="#10b981"
                      />
                      <DashboardChart
                        type="doughnut"
                        title="Top Categories"
                        description="Most popular content categories"
                        data={chartData.categories}
                      />
                    </div>
                  )}

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Latest platform activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No recent activity
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {recentActivity.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{activity.type}</Badge>
                                  <span className="font-medium">{activity.title}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.user} • {formatTimeAgo(activity.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </main>
        </div>
      </Layout>
    </>
  );
}

