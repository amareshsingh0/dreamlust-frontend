import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Mail, Bell, Smartphone } from 'lucide-react';
import { PushNotificationSettings } from './PushNotificationSettings';

interface Preferences {
  email: Record<string, boolean>;
  push: Record<string, boolean>;
  inApp: Record<string, boolean>;
  frequency: 'instant' | 'daily' | 'weekly' | 'never';
  unsubscribedAll: boolean;
}

const notificationTypes = [
  { key: 'newUpload', label: 'New Uploads' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'tips', label: 'Tips' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'system', label: 'System Notifications' },
  { key: 'followers', label: 'New Followers' },
  { key: 'subscribers', label: 'New Subscribers' },
];

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [_saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await api.notifications.getPreferences();
      if (response.success && response.data) {
        setPreferences(response.data as Preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (updates: Partial<Preferences>) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await api.notifications.updatePreferences({
        ...preferences,
        ...updates,
      });
      if (response.success && response.data) {
        setPreferences(response.data as Preferences);
        toast.success('Preferences updated');
      }
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmail = (key: string) => {
    if (!preferences) return;
    const newEmail = {
      ...preferences.email,
      [key]: !preferences.email[key],
    };
    updatePreference({ email: newEmail });
  };

  const togglePush = (key: string) => {
    if (!preferences) return;
    const newPush = {
      ...preferences.push,
      [key]: !preferences.push[key],
    };
    updatePreference({ push: newPush });
  };

  const toggleInApp = (key: string) => {
    if (!preferences) return;
    const newInApp = {
      ...preferences.inApp,
      [key]: !preferences.inApp[key],
    };
    updatePreference({ inApp: newInApp });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!preferences) {
    return <div>Failed to load preferences</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency Setting */}
          <div className="space-y-2">
            <Label>Notification Frequency</Label>
            <Select
              value={preferences.frequency}
              onValueChange={(value: any) =>
                updatePreference({ frequency: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unsubscribe All */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Unsubscribe from all notifications</Label>
              <p className="text-sm text-muted-foreground">
                Disable all email and push notifications
              </p>
            </div>
            <Switch
              checked={preferences.unsubscribedAll}
              onCheckedChange={(checked) =>
                updatePreference({ unsubscribedAll: checked })
              }
            />
          </div>

          {/* Notification Types */}
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="push">
                <Smartphone className="h-4 w-4 mr-2" />
                Push
              </TabsTrigger>
              <TabsTrigger value="inApp">
                <Bell className="h-4 w-4 mr-2" />
                In-App
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              {notificationTypes.map((type) => (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Label htmlFor={`email-${type.key}`}>{type.label}</Label>
                  <Switch
                    id={`email-${type.key}`}
                    checked={preferences.email[type.key] !== false}
                    onCheckedChange={() => toggleEmail(type.key)}
                    disabled={preferences.unsubscribedAll}
                  />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="push" className="space-y-4 mt-4">
              {notificationTypes.map((type) => (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Label htmlFor={`push-${type.key}`}>{type.label}</Label>
                  <Switch
                    id={`push-${type.key}`}
                    checked={preferences.push[type.key] !== false}
                    onCheckedChange={() => togglePush(type.key)}
                    disabled={preferences.unsubscribedAll}
                  />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="inApp" className="space-y-4 mt-4">
              {notificationTypes.map((type) => (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Label htmlFor={`inApp-${type.key}`}>{type.label}</Label>
                  <Switch
                    id={`inApp-${type.key}`}
                    checked={preferences.inApp[type.key] !== false}
                    onCheckedChange={() => toggleInApp(type.key)}
                    disabled={preferences.unsubscribedAll}
                  />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Push Notification Settings */}
      <PushNotificationSettings />
    </div>
  );
}

