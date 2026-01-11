/**
 * Cohort Metrics Charts Component
 * Displays line charts for cohort metrics over time
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricData {
  week: number;
  revenue?: number;
  avgWatchTime?: number;
  [key: string]: number | undefined;
}

interface CohortMetricsChartsProps {
  revenueData: MetricData[];
  engagementData: MetricData[];
}

export function CohortMetricsCharts({ revenueData, engagementData }: CohortMetricsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Per User Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Per User</CardTitle>
          <CardDescription>Average revenue by week</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  name="Revenue (₹)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
          <CardDescription>Average watch time by week (minutes)</CardDescription>
        </CardHeader>
        <CardContent>
          {engagementData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Watch Time (min)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${Math.round(value / 60)} min`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgWatchTime"
                  stroke="#82ca9d"
                  name="Watch Time (min)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No engagement data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


