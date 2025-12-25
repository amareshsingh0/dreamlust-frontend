/**
 * Funnel Segmentation Component
 * Compares funnel performance across different user segments
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FunnelResult } from './FunnelVisualization';

interface SegmentData {
  name: string;
  funnelData: FunnelResult[];
  conversionRate: number;
}

interface FunnelSegmentationProps {
  segments: Record<string, FunnelResult[]>;
}

export function FunnelSegmentation({ segments }: FunnelSegmentationProps) {
  const segmentNames: Record<string, string> = {
    all: 'All Users',
    new_users: 'New Users',
    returning: 'Returning Users',
    premium: 'Premium Users',
  };

  const formatSegmentData = (): SegmentData[] => {
    return Object.entries(segments).map(([key, results]) => {
      const firstStep = results[0];
      const lastStep = results[results.length - 1];
      const conversionRate =
        firstStep && lastStep && firstStep.userCount > 0
          ? (lastStep.userCount / firstStep.userCount) * 100
          : 0;

      return {
        name: segmentNames[key] || key,
        funnelData: results,
        conversionRate,
      };
    });
  };

  const segmentData = formatSegmentData();

  if (segmentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Analysis</CardTitle>
          <CardDescription>No segment data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Analysis</CardTitle>
        <CardDescription>Compare funnel performance across user segments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {segmentData.map((segment) => (
            <div key={segment.name} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{segment.name}</h4>
                <Badge variant={segment.conversionRate > 50 ? 'default' : 'secondary'}>
                  {segment.conversionRate.toFixed(1)}%
                </Badge>
              </div>

              {/* Mini Funnel */}
              <div className="space-y-1">
                {segment.funnelData.map((step, index) => {
                  const firstStepCount = segment.funnelData[0]?.userCount || 1;
                  const widthPercent = (step.userCount / firstStepCount) * 100;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{step.stepName || `Step ${index + 1}`}</span>
                        <span className="font-medium">{step.userCount}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(widthPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Conversion Rate
                </div>
                <div className="text-lg font-bold">
                  {segment.conversionRate.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


