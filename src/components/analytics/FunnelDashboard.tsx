/**
 * Funnel Dashboard Component
 * Main component for funnel analysis and visualization
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FunnelBuilder, FunnelStep } from './FunnelBuilder';
import { FunnelVisualization, FunnelResult } from './FunnelVisualization';
import { FunnelSegmentation } from './FunnelSegmentation';
import { Plus, Play, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Funnel {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  isActive: boolean;
  resultsCount: number;
  template?: string;
  variant?: string;
}

interface FunnelTemplate {
  name: string;
  description: string;
  template: string;
  steps: FunnelStep[];
}

export function FunnelDashboard() {
  const { toast } = useToast();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [funnelResults, setFunnelResults] = useState<FunnelResult[]>([]);
  const [segmentResults, setSegmentResults] = useState<Record<string, FunnelResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelDescription, setNewFunnelDescription] = useState('');
  const [newFunnelSteps, setNewFunnelSteps] = useState<FunnelStep[]>([
    { event: '', filter: 'all' },
  ]);
  const [creating, setCreating] = useState(false);
  const [_templates, setTemplates] = useState<FunnelTemplate[]>([]);
  const [_showTemplateDialog, _setShowTemplateDialog] = useState(false);
  const [_selectedTemplate, _setSelectedTemplate] = useState<string>('');
  const [_selectedVariant, _setSelectedVariant] = useState<string>('control');
  const [_trends, setTrends] = useState<any>(null);

  useEffect(() => {
    loadFunnels();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedFunnelId) {
      loadFunnelResults();
    }
  }, [selectedFunnelId]);

  const loadFunnels = async () => {
    try {
      const response = await api.funnels.get<Funnel[]>();
      if (response.success && response.data) {
        setFunnels(response.data);
        if (response.data.length > 0 && !selectedFunnelId) {
          setSelectedFunnelId(response.data[0].id);
        }
      }
    } catch (error: any) {
      console.error('Failed to load funnels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load funnels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.funnels.getTemplates<FunnelTemplate[]>();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    }
  };

  const _handleCreateFromTemplate = async () => {
    if (!_selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select a template',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await (api.funnels as any).createFromTemplate(_selectedTemplate, _selectedVariant);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Funnel created from template successfully',
        });
        _setShowTemplateDialog(false);
        _setSelectedTemplate('');
        _setSelectedVariant('control');
        loadFunnels();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create funnel from template',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const _handleExportFunnel = () => {
    if (!selectedFunnelId) return;
    (api.funnels as any).export(selectedFunnelId);
    toast({
      title: 'Exporting',
      description: 'Funnel data export started',
    });
  };

  const _handleLoadTrends = async () => {
    if (!selectedFunnelId) return;
    try {
      const response = await (api.funnels as any).getTrends(selectedFunnelId, 30);
      if (response.success && response.data) {
        setTrends(response.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load trends',
        variant: 'destructive',
      });
    }
  };

  const loadFunnelResults = async () => {
    if (!selectedFunnelId) return;

    setAnalyzing(true);
    try {
      const [resultsResponse, segmentsResponse] = await Promise.all([
        api.funnels.analyze<FunnelResult[]>(selectedFunnelId),
        api.funnels.analyzeSegments<Record<string, FunnelResult[]>>(selectedFunnelId),
      ]);

      if (resultsResponse.success && resultsResponse.data) {
        setFunnelResults(resultsResponse.data);
      }

      if (segmentsResponse.success && segmentsResponse.data) {
        setSegmentResults(segmentsResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to analyze funnel:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze funnel',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateFunnel = async () => {
    if (!newFunnelName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a funnel name',
        variant: 'destructive',
      });
      return;
    }

    if (newFunnelSteps.length === 0 || newFunnelSteps.some(s => !s.event.trim())) {
      toast({
        title: 'Error',
        description: 'Please add at least one step with an event name',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await api.funnels.create({
        name: newFunnelName,
        description: newFunnelDescription || undefined,
        steps: newFunnelSteps,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Funnel created successfully',
        });
        setShowCreateDialog(false);
        setNewFunnelName('');
        setNewFunnelDescription('');
        setNewFunnelSteps([{ event: '', filter: 'all' }]);
        loadFunnels();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create funnel',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const _selectedFunnel = funnels.find(f => f.id === selectedFunnelId);

  return (
    <div className="space-y-6">
      {/* Funnel Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Funnel Analysis</CardTitle>
              <CardDescription>Track and optimize conversion funnels</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Funnel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Custom Funnel</DialogTitle>
                  <DialogDescription>
                    Define the steps in your conversion funnel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="funnel-name">Funnel Name *</Label>
                    <Input
                      id="funnel-name"
                      value={newFunnelName}
                      onChange={(e) => setNewFunnelName(e.target.value)}
                      placeholder="e.g., Signup to Purchase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="funnel-description">Description (optional)</Label>
                    <Textarea
                      id="funnel-description"
                      value={newFunnelDescription}
                      onChange={(e) => setNewFunnelDescription(e.target.value)}
                      placeholder="Describe what this funnel tracks"
                      rows={3}
                    />
                  </div>
                  <FunnelBuilder steps={newFunnelSteps} onChange={setNewFunnelSteps} />
                  <Button onClick={handleCreateFunnel} disabled={creating} className="w-full">
                    {creating ? 'Creating...' : 'Create Funnel'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Select Funnel</Label>
              <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a funnel" />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name}
                      {funnel.template && (
                        <Badge variant="outline" className="ml-2">
                          {funnel.template}
                        </Badge>
                      )}
                      {funnel.variant && funnel.variant !== 'control' && (
                        <Badge variant="secondary" className="ml-2">
                          {funnel.variant}
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedFunnelId && (
              <Button onClick={loadFunnelResults} disabled={analyzing}>
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Analyze Funnel
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      {funnelResults.length > 0 && (
        <FunnelVisualization results={funnelResults} />
      )}

      {/* Segment Analysis */}
      {Object.keys(segmentResults).length > 0 && (
        <FunnelSegmentation segments={segmentResults} />
      )}

      {!selectedFunnelId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Create or select a funnel to start analysis
          </CardContent>
        </Card>
      )}
    </div>
  );
}

