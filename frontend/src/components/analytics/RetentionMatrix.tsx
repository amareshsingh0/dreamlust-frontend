/**
 * Retention Matrix Component
 * Displays cohort retention in a table format
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RetentionData {
  id: string;
  name: string;
  retentionByWeek: number[];
}

interface RetentionMatrixProps {
  cohorts: RetentionData[];
}

export function RetentionMatrix({ cohorts }: RetentionMatrixProps) {
  const getRetentionColor = (retention: number): string => {
    if (retention >= 0.8) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (retention >= 0.6) return 'bg-green-400/20 text-green-600 dark:text-green-500';
    if (retention >= 0.4) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    if (retention >= 0.2) return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    return 'bg-red-500/20 text-red-700 dark:text-red-400';
  };

  if (cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retention Matrix</CardTitle>
          <CardDescription>No cohort data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Matrix</CardTitle>
        <CardDescription>Percentage of users retained by week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">Cohort</th>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((week) => (
                  <th key={week} className="text-center p-2 font-semibold min-w-[80px]">
                    Week {week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{cohort.name}</td>
                  {cohort.retentionByWeek.map((retention, week) => (
                    <td
                      key={week}
                      className={cn(
                        'text-center p-2 font-medium',
                        getRetentionColor(retention)
                      )}
                    >
                      {(retention * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


