/**
 * Usage Stats Component
 * Displays subscription usage statistics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Clock, Download } from 'lucide-react';

interface UsageStatsProps {
  videosWatched: number;
  hoursWatched: number;
  downloads: number;
  planPrice?: number;
}

export function UsageStats({ videosWatched, hoursWatched, downloads, planPrice }: UsageStatsProps) {
  const pricePerHour = planPrice && hoursWatched > 0
    ? (planPrice / hoursWatched).toFixed(2)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
        <CardDescription>Your subscription activity for the current billing period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Play className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{videosWatched}</span>
            </div>
            <p className="text-sm text-muted-foreground">Videos Watched</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{hoursWatched.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Hours Streamed</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Download className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{downloads}</span>
            </div>
            <p className="text-sm text-muted-foreground">Downloads</p>
          </div>
        </div>

        {pricePerHour && (
          <div className="pt-4 border-t">
            <p className="text-sm text-center text-muted-foreground">
              You've watched <span className="font-semibold">{hoursWatched.toFixed(1)} hours</span> this month.
              That's <span className="font-semibold text-primary">₹{pricePerHour}</span> per hour!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


