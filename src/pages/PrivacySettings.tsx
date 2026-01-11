import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Shield,
  Lock,
  Download,
  Trash2,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PrivacySettingsData {
  historyLockEnabled?: boolean;
  profileVisibility?: string;
  showOnlineStatus?: boolean;
  allowComments?: boolean;
  allowMessages?: boolean;
}

interface DeletionRequestData {
  daysRemaining?: number;
  status?: string;
  requestedAt?: string;
}

export default function PrivacySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsData | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<DeletionRequestData | null>(null);
  
  // History Lock
  const [historyLockEnabled, setHistoryLockEnabled] = useState(false);
  const [historyLockPin, setHistoryLockPin] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [verifyPinDialog, setVerifyPinDialog] = useState(false);
  const [verifyPin, setVerifyPin] = useState('');
  
  // Account Deletion
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  
  // Data Export
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
    loadDeletionStatus();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const response = await api.privacy.get<PrivacySettingsData>();
      if (response.success && response.data) {
        setPrivacySettings(response.data);
        setHistoryLockEnabled(response.data.historyLockEnabled || false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load privacy settings',
        variant: 'destructive',
      });
    }
  };

  const loadDeletionStatus = async () => {
    try {
      const response = await api.privacy.getDeletionStatus<DeletionRequestData>();
      if (response.success && response.data) {
        setDeletionStatus(response.data);
      }
    } catch (error: any) {
      // Ignore errors for deletion status
    }
  };

  const handleUpdatePrivacy = async (updates: any) => {
    setLoading(true);
    try {
      const response = await api.privacy.update(updates);
      if (response.success) {
        setPrivacySettings({ ...privacySettings, ...updates });
        toast({
          title: 'Success',
          description: 'Privacy settings updated successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to update privacy settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryLockToggle = () => {
    if (!historyLockEnabled) {
      // Enable - show PIN dialog
      setShowPinDialog(true);
    } else {
      // Disable - show verification dialog
      setVerifyPinDialog(true);
    }
  };

  const handleSetHistoryLock = async () => {
    if (!historyLockPin || historyLockPin.length < 4) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be at least 4 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.privacy.setHistoryLock({
        enabled: true,
        pin: historyLockPin,
      });
      if (response.success) {
        setHistoryLockEnabled(true);
        setShowPinDialog(false);
        setHistoryLockPin('');
        toast({
          title: 'Success',
          description: 'History lock enabled',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to enable history lock',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHistoryLock = async () => {
    setLoading(true);
    try {
      const response = await api.privacy.verifyHistoryLock({ pin: verifyPin });
      if (response.success) {
        // Disable history lock
        const disableResponse = await api.privacy.setHistoryLock({ enabled: false });
        if (disableResponse.success) {
          setHistoryLockEnabled(false);
          setVerifyPinDialog(false);
          setVerifyPin('');
          toast({
            title: 'Success',
            description: 'History lock disabled',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Invalid PIN',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await api.privacy.exportData({
        format: 'json',
        includeContent: true,
        includeHistory: true,
        includePlaylists: true,
      });
      if (response.success && response.data) {
        // Download as JSON file
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dreamlust-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Success',
          description: 'Data export downloaded',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!deletionPassword) {
      toast({
        title: 'Error',
        description: 'Password is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.privacy.requestDeletion<DeletionRequestData>({
        password: deletionPassword,
        reason: deletionReason || undefined,
      });
      if (response.success) {
        setShowDeletionDialog(false);
        setDeletionPassword('');
        setDeletionReason('');
        loadDeletionStatus();
        toast({
          title: 'Account Deletion Requested',
          description: `Your account will be deleted in ${response.data?.daysRemaining || 30} days. You can cancel anytime.`,
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to request account deletion',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      const response = await api.privacy.cancelDeletion();
      if (response.success) {
        loadDeletionStatus();
        toast({
          title: 'Success',
          description: 'Account deletion cancelled',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to cancel deletion',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!privacySettings) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading privacy settings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Privacy Settings - PassionFantasia</title>
        <meta name="description" content="Manage your privacy settings and data" />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Privacy & Safety
            </h1>
            <p className="text-muted-foreground">
              Control your privacy settings and manage your data
            </p>
          </div>

          {/* Privacy Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Privacy Controls
              </CardTitle>
              <CardDescription>
                Control who can see your activity and content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hide Watch History</Label>
                  <p className="text-sm text-muted-foreground">
                    Don't record your viewing history
                  </p>
                </div>
                <Switch
                  checked={privacySettings.hideHistory || false}
                  onCheckedChange={(checked) => handleUpdatePrivacy({ hideHistory: checked })}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Anonymous Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Browse without personalization or tracking
                  </p>
                </div>
                <Switch
                  checked={privacySettings.anonymousMode || false}
                  onCheckedChange={(checked) => handleUpdatePrivacy({ anonymousMode: checked })}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Personalization</Label>
                  <p className="text-sm text-muted-foreground">
                    Use your data to personalize recommendations
                  </p>
                </div>
                <Switch
                  checked={privacySettings.allowPersonalization !== false}
                  onCheckedChange={(checked) => handleUpdatePrivacy({ allowPersonalization: checked })}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Activity Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  checked={privacySettings.showActivityStatus !== false}
                  onCheckedChange={(checked) => handleUpdatePrivacy({ showActivityStatus: checked })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Who can message you</Label>
                <Select
                  value={privacySettings.allowMessages || 'everyone'}
                  onValueChange={(value: 'everyone' | 'following' | 'none') => 
                    handleUpdatePrivacy({ allowMessages: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="following">Following Only</SelectItem>
                    <SelectItem value="none">No One</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Watch History Visibility</Label>
                <Select
                  value={privacySettings.showWatchHistory || 'private'}
                  onValueChange={(value: 'public' | 'friends' | 'private') => 
                    handleUpdatePrivacy({ showWatchHistory: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Playlists Visibility</Label>
                <Select
                  value={privacySettings.showPlaylists || 'public'}
                  onValueChange={(value: 'public' | 'friends' | 'private') => 
                    handleUpdatePrivacy({ showPlaylists: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Liked Content Visibility</Label>
                <Select
                  value={privacySettings.showLikedContent || 'private'}
                  onValueChange={(value: 'public' | 'friends' | 'private') => 
                    handleUpdatePrivacy({ showLikedContent: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* History Lock */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                History Lock
              </CardTitle>
              <CardDescription>
                Protect your watch history and playlists with a PIN
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable History Lock</Label>
                  <p className="text-sm text-muted-foreground">
                    Require PIN to access watch history and playlists
                  </p>
                </div>
                <Switch
                  checked={historyLockEnabled}
                  onCheckedChange={handleHistoryLockToggle}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Export
              </CardTitle>
              <CardDescription>
                Download all your data (GDPR compliance)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportData}
                disabled={exporting}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export My Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Account Deletion */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Account Deletion
              </CardTitle>
              <CardDescription>
                Permanently delete your account (30-day grace period)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deletionStatus?.requested ? (
                <div className="space-y-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Deletion Scheduled</p>
                      <p className="text-sm text-muted-foreground">
                        Your account will be deleted on {new Date(deletionStatus.scheduledFor).toLocaleDateString()}
                      </p>
                      {deletionStatus.daysRemaining && (
                        <p className="text-sm font-medium text-destructive mt-1">
                          {deletionStatus.daysRemaining} days remaining
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleCancelDeletion}
                    disabled={loading}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Cancel Deletion
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowDeletionDialog(true)}
                  disabled={loading}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Request Account Deletion
                </Button>
              )}
            </CardContent>
          </Card>

          {/* History Lock PIN Dialog */}
          <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set History Lock PIN</DialogTitle>
                <DialogDescription>
                  Enter a 4-8 digit PIN to protect your watch history
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={historyLockPin}
                    onChange={(e) => setHistoryLockPin(e.target.value)}
                    placeholder="Enter PIN (4-8 digits)"
                    maxLength={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPinDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSetHistoryLock} disabled={loading || !historyLockPin}>
                  Enable Lock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Verify History Lock PIN Dialog */}
          <Dialog open={verifyPinDialog} onOpenChange={setVerifyPinDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify PIN to Disable</DialogTitle>
                <DialogDescription>
                  Enter your PIN to disable history lock
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-pin">PIN</Label>
                  <Input
                    id="verify-pin"
                    type="password"
                    value={verifyPin}
                    onChange={(e) => setVerifyPin(e.target.value)}
                    placeholder="Enter PIN"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVerifyPinDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyHistoryLock} disabled={loading || !verifyPin}>
                  Verify & Disable
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Account Deletion Dialog */}
          <Dialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Your account will be permanently deleted after 30 days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deletion-password">Confirm Password</Label>
                  <Input
                    id="deletion-password"
                    type="password"
                    value={deletionPassword}
                    onChange={(e) => setDeletionPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deletion-reason">Reason (Optional)</Label>
                  <Textarea
                    id="deletion-reason"
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="Tell us why you're leaving..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeletionDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestDeletion}
                  disabled={loading || !deletionPassword}
                  variant="destructive"
                >
                  Request Deletion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}

