import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';

interface Version {
  id: string;
  version: number;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  changes?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

interface Experiment {
  id: string;
  status: string;
  variants: Array<{
    versionId: string;
    version: number;
    weight: number;
    metrics: {
      views: number;
      ctr: number;
      watchTime: number;
      completion: number;
    };
  }>;
  startDate: string;
  endDate?: string;
  winnerVersionId?: string;
}

interface ContentVersioningProps {
  contentId: string;
}

export const ContentVersioning: React.FC<ContentVersioningProps> = ({ contentId }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
    fetchExperiment();
  }, [contentId]);

  const fetchVersions = async () => {
    try {
      const response = await axios.get(`/api/content/${contentId}/versions`);
      setVersions(response.data);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExperiment = async () => {
    try {
      const response = await axios.get(`/api/content/${contentId}/experiments`);
      const activeExperiment = response.data.find((exp: Experiment) => exp.status === 'running');
      setExperiment(activeExperiment || null);
    } catch (error) {
      console.error('Error fetching experiment:', error);
    }
  };

  const publishVersion = async (versionId: string) => {
    try {
      await axios.post(`/api/content/${contentId}/versions/${versionId}/publish`);
      fetchVersions();
    } catch (error) {
      console.error('Error publishing version:', error);
    }
  };

  const startABTest = async (versionId: string) => {
    try {
      const currentVersion = versions.find(v => v.isPublished);
      if (!currentVersion) return;

      await axios.post(`/api/content/${contentId}/experiments`, {
        variants: [
          { versionId: currentVersion.id, weight: 50 },
          { versionId, weight: 50 },
        ],
      });
      fetchExperiment();
    } catch (error) {
      console.error('Error starting A/B test:', error);
    }
  };

  const declareWinner = async () => {
    if (!experiment) return;

    const winner = experiment.variants.reduce((prev, current) =>
      current.metrics.ctr > prev.metrics.ctr ? current : prev
    );

    try {
      await axios.post(`/api/content/${contentId}/experiments/${experiment.id}/complete`, {
        winnerVersionId: winner.versionId,
      });
      fetchVersions();
      fetchExperiment();
    } catch (error) {
      console.error('Error declaring winner:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading versions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-lg font-semibold">
                    v{version.version}
                  </Badge>
                </div>

                <div className="flex-shrink-0 w-32 h-20">
                  <img
                    src={version.thumbnailUrl}
                    alt={version.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg truncate">{version.title}</h4>
                  {version.changes && (
                    <p className="text-sm text-muted-foreground mt-1">{version.changes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(version.videoUrl, '_blank')}
                  >
                    Preview
                  </Button>
                  {!version.isPublished && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => publishVersion(version.id)}
                      >
                        Publish
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startABTest(version.id)}
                      >
                        A/B Test
                      </Button>
                    </>
                  )}
                  {version.isPublished && (
                    <Badge variant="default">Live</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {experiment && experiment.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {experiment.variants.map((variant) => {
                const version = versions.find(v => v.id === variant.versionId);
                const isLeading = variant.metrics.ctr === Math.max(...experiment.variants.map(v => v.metrics.ctr));

                return (
                  <Card key={variant.versionId} className={isLeading ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Version {version?.version || variant.version}
                        </CardTitle>
                        {isLeading && <Badge variant="default">Leading</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="text-2xl font-bold">{variant.metrics.views}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CTR</p>
                          <p className="text-2xl font-bold">
                            {(variant.metrics.ctr * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Watch Time</p>
                          <p className="text-2xl font-bold">
                            {formatDuration(variant.metrics.watchTime)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                          <p className="text-2xl font-bold">
                            {(variant.metrics.completion * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button onClick={declareWinner} className="w-full">
              Declare Winner & Publish
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
