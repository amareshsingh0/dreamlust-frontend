import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { BarChart3, TrendingUp, Users, Eye, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Analytics = () => {
  // Mock analytics data
  const stats = [
    { label: "Total Views", value: "1.2M", change: "+12%", icon: Eye },
    { label: "Subscribers", value: "45.2K", change: "+8%", icon: Users },
    { label: "Revenue", value: "$12,450", change: "+23%", icon: DollarSign },
    { label: "Watch Time", value: "890K hrs", change: "+15%", icon: Calendar },
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
            <div className="flex items-center gap-3 mb-8">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="font-display text-3xl font-bold">Creator Analytics</h1>
                <p className="text-muted-foreground">Track your performance and grow your audience</p>
              </div>
            </div>

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
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change} from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart Placeholder */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground">
                    📊 Interactive chart will appear here when you have data
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Top Content */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center font-bold">
                        #{i}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">Sample Content Title {i}</p>
                        <p className="text-sm text-muted-foreground">
                          {(Math.random() * 100).toFixed(0)}K views • {(Math.random() * 10).toFixed(0)}K likes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary-foreground bg-primary px-2 py-1 rounded">${(Math.random() * 1000).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">earned</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Analytics;
