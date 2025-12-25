/**
 * Admin Churn Prediction Dashboard
 * Dashboard for viewing churn predictions and retention analytics
 */

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Mail, MailOpen, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChurnPrediction {
  id: string;
  userId: string;
  churnProbability: number;
  riskFactors: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  lastCalculated: string;
  interventionSent: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    display_name?: string;
  };
}

interface RetentionMetrics {
  totalCampaigns: number;
  emailsSent: number;
  emailsOpened: number;
  usersReturned: number;
  retentionRate: number;
  campaignSuccessRate: number;
  openRate: number;
}

export default function ChurnDashboard() {
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [predictionsRes, metricsRes] = await Promise.all([
        api.admin.churn.getPredictions(),
        api.admin.churn.getRetentionMetrics(),
      ]);

      if (predictionsRes.success && predictionsRes.data) {
        setPredictions(predictionsRes.data as ChurnPrediction[]);
      }

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data as RetentionMetrics);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (probability: number) => {
    if (probability >= 0.7) return 'destructive';
    if (probability >= 0.5) return 'default';
    return 'secondary';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'destructive';
    if (severity === 'medium') return 'default';
    return 'secondary';
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Churn Prediction Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor users at risk of churning and retention campaign effectiveness
          </p>
        </div>

        {/* Retention Metrics */}
        {loading ? (
          <Skeleton className="h-32 mb-6" />
        ) : metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalCampaigns}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emails Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.emailsSent}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.openRate.toFixed(1)}% open rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MailOpen className="h-4 w-4" />
                  Emails Opened
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.emailsOpened}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Users Returned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.usersReturned}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.retentionRate.toFixed(1)}% retention rate
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Churn Predictions */}
        <Card>
          <CardHeader>
            <CardTitle>Users at Risk</CardTitle>
            <CardDescription>
              Users with churn probability above 50%
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : predictions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No users at risk currently
              </p>
            ) : (
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {prediction.user.display_name || prediction.user.username}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {prediction.user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getRiskColor(prediction.churnProbability)}>
                          {(prediction.churnProbability * 100).toFixed(0)}% risk
                        </Badge>
                        {prediction.interventionSent && (
                          <Badge variant="outline" className="ml-2">
                            Intervention Sent
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Risk Factors:</p>
                      <div className="flex flex-wrap gap-2">
                        {prediction.riskFactors.map((factor, idx) => (
                          <Badge
                            key={idx}
                            variant={getSeverityColor(factor.severity)}
                            className="text-xs"
                          >
                            {factor.description}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Last calculated: {new Date(prediction.lastCalculated).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


