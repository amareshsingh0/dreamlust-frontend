import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Shield,
  AlertTriangle,
  Eye,
  MessageSquare,
  User,
  FileVideo,
  Filter,
  RefreshCw
} from 'lucide-react';

interface Report {
  id: string;
  content_type: string;
  target_id?: string;
  content_id?: string;
  reported_user_id?: string;
  type: string;
  reason: string;
  description?: string;
  status: string;
  action?: string;
  moderator_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export default function ModerationDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveAction, setResolveAction] = useState<'removed' | 'warned' | 'none' | 'banned'>('none');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [filters, setFilters] = useState({
    status: 'PENDING' as string,
    contentType: '' as string,
    severity: '' as string,
  });
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadReports();
    loadStats();
  }, [filters, page]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await api.moderation.getQueue({
        status: filters.status || undefined,
        contentType: filters.contentType || undefined,
        severity: filters.severity || undefined,
        page,
        limit: 20,
      });
      if (response.success && response.data) {
        const data = response.data as { reports: Report[]; pagination?: { totalPages: number } };
        setReports(data.reports || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.moderation.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      // Ignore stats errors
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;

    setLoading(true);
    try {
      const response = await api.moderation.resolveReport(selectedReport.id, {
        status: 'RESOLVED',
        action: resolveAction,
        moderatorNotes: moderatorNotes || undefined,
      });
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Report resolved successfully',
        });
        setShowResolveDialog(false);
        setSelectedReport(null);
        setModeratorNotes('');
        loadReports();
        loadStats();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to resolve report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'default',
      UNDER_REVIEW: 'secondary',
      RESOLVED: 'outline',
      DISMISSED: 'outline',
      ACTION_TAKEN: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const _getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return (
      <Badge className={colors[severity] || 'bg-gray-500'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'content':
        return <FileVideo className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'creator':
        return <User className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Moderation Dashboard - PassionFantasia</title>
        <meta name="description" content="Admin moderation dashboard" />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Moderation Dashboard
            </h1>
            <p className="text-muted-foreground">
              Review and manage content reports and flags
            </p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reports?.pending || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reports?.underReview || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.flags?.active || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Critical Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.flags?.critical || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="DISMISSED">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={filters.contentType}
                    onValueChange={(value) => setFilters({ ...filters, contentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="creator">Creator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={filters.severity}
                    onValueChange={(value) => setFilters({ ...filters, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Severities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reports Queue</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadReports}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && reports.length === 0 ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reports found
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getContentTypeIcon(report.content_type || 'content')}
                              <span className="font-semibold">{report.type}</span>
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Reason: {report.reason}
                            </p>
                            {report.description && (
                              <p className="text-sm">{report.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Reported {new Date(report.created_at).toLocaleDateString()}</span>
                              {report.reviewed_at && (
                                <span>• Reviewed {new Date(report.reviewed_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                // Open content preview or navigate to content
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {report.status === 'PENDING' || report.status === 'UNDER_REVIEW' ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setShowResolveDialog(true);
                                }}
                              >
                                Resolve
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolve Dialog */}
          <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve Report</DialogTitle>
                <DialogDescription>
                  Choose an action and add notes for this report
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={resolveAction}
                    onValueChange={(value: any) => setResolveAction(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Action</SelectItem>
                      <SelectItem value="warned">Warn Creator</SelectItem>
                      <SelectItem value="removed">Remove Content</SelectItem>
                      <SelectItem value="banned">Ban User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moderator Notes</Label>
                  <Textarea
                    value={moderatorNotes}
                    onChange={(e) => setModeratorNotes(e.target.value)}
                    placeholder="Add notes about this resolution..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResolve} disabled={loading}>
                  {loading ? 'Resolving...' : 'Resolve Report'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}

