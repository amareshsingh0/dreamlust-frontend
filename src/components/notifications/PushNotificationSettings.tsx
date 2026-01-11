import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Check, X } from 'lucide-react';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscriptions,
  isPushNotificationSupported,
  hasNotificationPermission,
} from '@/lib/push/notifications';
import { toast } from 'sonner';

interface PushSubscription {
  id: string;
  endpoint: string;
  device?: string;
  createdAt: string;
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [_loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);

  useEffect(() => {
    checkPushSupport();
    loadSubscriptions();
  }, []);

  const checkPushSupport = () => {
    const isSupported = isPushNotificationSupported();
    const hasPerm = hasNotificationPermission();
    setSupported(isSupported);
    setHasPermission(hasPerm);
    setSubscribed(hasPerm);
  };

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const subs = await getPushSubscriptions();
      setSubscriptions(subs);
      setSubscribed(subs.length > 0);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const success = await subscribeToPushNotifications();
      if (success) {
        toast.success('Push notifications enabled!');
        setSubscribed(true);
        await loadSubscriptions();
      } else {
        toast.error('Failed to enable push notifications');
      }
    } catch (error) {
      toast.error('Failed to enable push notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (endpoint: string) => {
    try {
      const success = await unsubscribeFromPushNotifications(endpoint);
      if (success) {
        toast.success('Push notifications disabled');
        await loadSubscriptions();
      } else {
        toast.error('Failed to disable push notifications');
      }
    } catch (error) {
      toast.error('Failed to disable push notifications');
    }
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          Receive notifications even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Browser Notifications</p>
            <p className="text-sm text-muted-foreground">
              {hasPermission
                ? 'You have granted notification permission'
                : 'Click to enable push notifications'}
            </p>
          </div>
          {hasPermission ? (
            <Badge variant="default" className="bg-green-500">
              <Check className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline">
              <X className="h-3 w-3 mr-1" />
              Disabled
            </Badge>
          )}
        </div>

        {!subscribed && (
          <Button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            {subscribing ? 'Enabling...' : 'Enable Push Notifications'}
          </Button>
        )}

        {subscriptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Active Subscriptions</p>
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">
                    {sub.device || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnsubscribe(sub.endpoint)}
                >
                  <BellOff className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

