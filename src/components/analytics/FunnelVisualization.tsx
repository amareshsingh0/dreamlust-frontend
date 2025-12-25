/**
 * Funnel Visualization Component
 * Displays funnel steps with drop-off rates
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FunnelResult {
  stepIndex: number;
  stepName: string;
  eventName: string;
  userCount: number;
  conversionRate: number;
  dropoffRate?: number;
  segment?: string;
}

interface FunnelVisualizationProps {
  results: FunnelResult[];
}

export function FunnelVisualization({ results }: FunnelVisualizationProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funnel Visualization</CardTitle>
          <CardDescription>No funnel data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const firstStepCount = results[0]?.userCount || 1;
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  const getStepColor = (index: number): string => {
    return colors[index % colors.length];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getDropoffInsights = (index: number): string[] => {
    const insights: string[] = [];
    const currentStep = results[index];
    const nextStep = results[index + 1];

    if (!currentStep || !nextStep) return insights;

    const dropoffRate = currentStep.dropoffRate || 0;

    if (dropoffRate > 0.5) {
      insights.push('High drop-off detected - consider optimizing this step');
    }

    if (dropoffRate > 0.3 && dropoffRate <= 0.5) {
      insights.push('Moderate drop-off - review user experience');
    }

    if (currentStep.userCount < 100) {
      insights.push('Low user volume - may need more traffic');
    }

    return insights;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel Visualization</CardTitle>
        <CardDescription>Conversion funnel with drop-off analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {results.map((step, index) => {
          const widthPercent = (step.userCount / firstStepCount) * 100;
          const dropoffInsights = getDropoffInsights(index);

          return (
            <div key={index} className="space-y-2">
              {/* Step Bar */}
              <div className="relative">
                <div
                  className={cn(
                    'h-16 rounded-lg flex items-center justify-between px-4 text-white transition-all',
                    getStepColor(index)
                  )}
                  style={{ width: `${Math.max(widthPercent, 5)}%` }}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-lg">{step.stepName || `Step ${index + 1}`}</div>
                      <div className="text-sm opacity-90">{step.eventName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatNumber(step.userCount)}</div>
                    <div className="text-sm opacity-90">
                      {((step.userCount / firstStepCount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Drop-off Info */}
              {index < results.length - 1 && (
                <div className="ml-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">
                      {step.dropoffRate
                        ? `${(step.dropoffRate * 100).toFixed(1)}% drop-off`
                        : '0% drop-off'}
                    </span>
                    <span className="text-muted-foreground">
                      ({formatNumber(step.userCount - results[index + 1].userCount)} users)
                    </span>
                  </div>

                  {dropoffInsights.length > 0 && (
                    <Alert variant="default" className="bg-yellow-50 dark:bg-yellow-950/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {dropoffInsights.map((insight, i) => (
                            <li key={i} className="text-sm">{insight}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}


