/**
 * Funnel Analysis Component
 * 
 * Visualizes conversion funnels and dropoff rates
 */

import { useState, useEffect } from 'react';
import { TrendingDown, Users, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FunnelStep {
  step: string;
  count: number;
  dropoff: number;
  conversionRate: number;
}

interface FunnelAnalysis {
  funnelName: string;
  steps: FunnelStep[];
  totalUsers: number;
  finalConversionRate: number;
  timeRange: {
    start: string;
    end: string;
  };
}

export function FunnelAnalysis() {
  const [funnels, setFunnels] = useState<Array<{ name: string; steps: string[]; stepCount: number }>>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');
  const [analysis, setAnalysis] = useState<FunnelAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const { toast } = useToast();

  // Load available funnels
  useEffect(() => {
    loadFunnels();
  }, []);

  const loadFunnels = async () => {
    try {
      const response = await (api as any).funnelAnalytics.getFunnels();
      if (response.success && response.data) {
        const funnelData = response.data as Array<{ name: string; steps: string[]; stepCount: number }>;
        setFunnels(funnelData);
        if (funnelData.length > 0 && !selectedFunnel) {
          setSelectedFunnel(funnelData[0].name);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load funnels',
        variant: 'destructive',
      });
    }
  };

  const analyzeFunnel = async () => {
    if (!selectedFunnel) {
      toast({
        title: 'Error',
        description: 'Please select a funnel',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await (api as any).funnelAnalytics.analyze({
        funnelName: selectedFunnel as any,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });

      if (response.success && response.data) {
        setAnalysis(response.data as unknown as FunnelAnalysis);
      } else {
        throw new Error(response.error?.message || 'Failed to analyze funnel');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze funnel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFunnel) {
      analyzeFunnel();
    }
  }, [selectedFunnel, startDate, endDate]);

  const formatStepName = (step: string) => {
    return step
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/%/g, '%');
  };

  const getDropoffColor = (dropoff: number) => {
    if (dropoff > 50) return 'text-red-500';
    if (dropoff > 25) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funnel Analysis</h2>
          <p className="text-muted-foreground">
            Track conversion rates and identify dropoff points
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select funnel and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="funnel">Funnel</Label>
              <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                <SelectTrigger id="funnel">
                  <SelectValue placeholder="Select funnel" />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((funnel) => (
                    <SelectItem key={funnel.name} value={funnel.name}>
                      {formatStepName(funnel.name)} ({funnel.stepCount} steps)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : analysis ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Users who started the funnel
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Final Conversion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.finalConversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Completed entire funnel
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Biggest Dropoff</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analysis.steps.length > 0 ? (
                  <>
                    <div className="text-2xl font-bold text-red-500">
                      {Math.max(...analysis.steps.map((s) => s.dropoff)).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatStepName(
                        analysis.steps.find(
                          (s) => s.dropoff === Math.max(...analysis.steps.map((s) => s.dropoff))
                        )?.step || ''
                      )}
                    </p>
                  </>
                ) : (
                  <div className="text-2xl font-bold">N/A</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Funnel Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Funnel Steps</CardTitle>
              <CardDescription>
                Conversion rates and dropoff at each step
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.steps.map((step, index) => {
                  const width = (step.conversionRate / 100) * 100;
                  const isLast = index === analysis.steps.length - 1;

                  return (
                    <div key={step.step} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {index + 1}. {formatStepName(step.step)}
                          </span>
                          {step.dropoff > 0 && (
                            <span className={cn('text-xs flex items-center gap-1', getDropoffColor(step.dropoff))}>
                              <TrendingDown className="h-3 w-3" />
                              {step.dropoff.toFixed(1)}% dropoff
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {step.count.toLocaleString()} users ({step.conversionRate.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="relative h-8 bg-muted rounded-md overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${width}%` }}
                        >
                          {width > 10 && (
                            <span className="text-xs text-primary-foreground font-medium">
                              {step.conversionRate.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {!isLast && (
                        <div className="flex justify-center">
                          <div className="h-4 w-px bg-border" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Select a funnel and date range to view analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


