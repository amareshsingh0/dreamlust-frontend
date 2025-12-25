import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Bell, CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const Notifications = () => {
  // Mock notifications (in real app, fetch from Supabase)
  const notifications = [
    {
      id: '1',
      type: 'info',
      title: 'New content from Creator One',
      message: 'Creator One just uploaded a new video',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: 'You got a new follower',
      message: 'Creator Two started following you',
      time: '5 hours ago',
      read: false,
    },
    {
      id: '3',
      type: 'alert',
      title: 'Comment on your content',
      message: 'Someone commented on your video',
      time: '1 day ago',
      read: true,
    },
    {
      id: '4',
      type: 'info',
      title: 'Weekly digest',
      message: 'Here\'s what you missed this week',
      time: '2 days ago',
      read: true,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Notifications - PassionFantasia</title>
        <meta name="description" content="Your notifications" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Bell className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-display font-bold">Notifications</h1>
              </div>
              <p className="text-muted-foreground">
                Stay updated with your activity
              </p>
            </div>
            <Button variant="outline" size="sm">
              Mark all as read
            </Button>
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Notifications</h3>
                <p className="text-muted-foreground">
                  You're all caught up!
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={notification.read ? "opacity-60" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold mb-1">{notification.title}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {notification.time}
                              </p>
                            </div>
                            {!notification.read && (
                              <Badge variant="default" className="ml-2">New</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Notifications;

