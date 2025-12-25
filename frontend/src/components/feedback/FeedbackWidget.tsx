/**
 * Feedback Widget Component
 * 
 * Modern, user-friendly feedback widget for users to submit bug reports, feature requests, and general feedback
 */

import { useState } from 'react';
// Import lucide-react icons - Vite will tree-shake automatically
import { 
  MessageSquare, 
  X, 
  Upload, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Lightbulb, 
  MessageCircle 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface FeedbackWidgetProps {
  className?: string;
}

export function FeedbackWidget({ className }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'bug_report' | 'feature_request' | 'general_feedback'>('general_feedback');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Get user from auth context - widget works with or without authenticated user
  const authContext = useAuth();
  const _user = authContext?.user || null;

  const feedbackTypes = [
    {
      value: 'bug_report' as const,
      label: 'Bug Report',
      icon: AlertCircle,
      description: 'Report an issue or error',
      color: 'text-red-500',
    },
    {
      value: 'feature_request' as const,
      label: 'Feature Request',
      icon: Lightbulb,
      description: 'Suggest a new feature',
      color: 'text-yellow-500',
    },
    {
      value: 'general_feedback' as const,
      label: 'General Feedback',
      icon: MessageCircle,
      description: 'Share your thoughts',
      color: 'text-blue-500',
    },
  ];

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Screenshot must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }

      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const uploadScreenshot = async (file: File): Promise<string | undefined> => {
    try {
      // Upload screenshot to S3/R2 via API
      const response = await api.feedback.uploadScreenshot(file);
      const data = response.data as { url?: string } | undefined;

      if (response.success && data?.url) {
        return data.url;
      }

      throw new Error('Failed to upload screenshot');
    } catch (error) {
      console.error('Failed to upload screenshot:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload screenshot. You can still submit feedback without it.',
        variant: 'destructive',
      });
      return undefined;
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please provide feedback message',
        variant: 'destructive',
      });
      return;
    }

    if (message.length < 10) {
      toast({
        title: 'Message too short',
        description: 'Please provide at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot if provided
      let screenshotUrl: string | undefined;
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
      }

      // Collect metadata
      const metadata = {
        browser: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };

      // Submit feedback
      const response = await api.feedback.submit({
        type,
        message: message.trim(),
        screenshot: screenshotUrl,
        url: window.location.href,
        metadata,
      });

      if (response.success) {
        toast({
          title: 'Thank you!',
          description: 'Your feedback has been submitted successfully.',
        });

        // Reset form
        setMessage('');
        setScreenshot(null);
        setScreenshotPreview(null);
        setType('general_feedback');
        setOpen(false);
      } else {
        throw new Error(response.error?.message || 'Failed to submit feedback');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Modern Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground px-5 py-4 rounded-full shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300 group',
          'backdrop-blur-sm border border-primary/20',
          className
        )}
        aria-label="Submit feedback"
      >
        <div className="relative">
          <MessageSquare className="h-5 w-5 transition-transform group-hover:scale-110" />
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
        </div>
        <span className="hidden sm:inline font-medium">Feedback</span>
      </button>

      {/* Modern Feedback Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0 overflow-hidden [&>div]:scrollbar-hide">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-6 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                Share Your Feedback
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Help us improve by sharing your thoughts, reporting bugs, or suggesting features.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto scrollbar-hide max-h-[calc(90vh-200px)] p-6 space-y-6">
            {/* Feedback Type Selection - Modern Cards */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">What would you like to share?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {feedbackTypes.map((feedbackType) => {
                  const Icon = feedbackType.icon;
                  const isSelected = type === feedbackType.value;
                  return (
                    <button
                      key={feedbackType.value}
                      type="button"
                      onClick={() => setType(feedbackType.value)}
                      className={cn(
                        'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
                        'hover:scale-[1.02] hover:shadow-lg',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-5 w-5', feedbackType.color)} />
                          <span className="font-semibold text-sm">{feedbackType.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{feedbackType.description}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message - Enhanced */}
            <div className="space-y-2">
              <Label htmlFor="feedback-message" className="text-sm font-semibold">
                Tell us more
              </Label>
              <Textarea
                id="feedback-message"
                placeholder={
                  type === 'bug_report'
                    ? 'Describe the bug you encountered...'
                    : type === 'feature_request'
                    ? "Describe the feature you'd like to see..."
                    : 'Share your thoughts with us...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none min-h-[120px] text-base"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {message.length < 10 ? (
                    <span className="text-orange-500">At least 10 characters required</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {message.length}/5000 characters
                    </span>
                  )}
                </p>
                <div className="flex gap-1">
                  {[10, 50, 100, 500].map((threshold) => (
                    <div
                      key={threshold}
                      className={cn(
                        'h-1 w-1 rounded-full transition-colors',
                        message.length >= threshold ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Screenshot Upload - Enhanced */}
            <div className="space-y-2">
              <Label htmlFor="feedback-screenshot" className="text-sm font-semibold">
                Screenshot (optional)
              </Label>
              {screenshotPreview ? (
                <div className="relative group rounded-xl overflow-hidden border-2 border-border">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full h-auto max-h-64 object-contain bg-muted/50"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    onClick={removeScreenshot}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Label
                  htmlFor="feedback-screenshot"
                  className="flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload a screenshot</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                  <input
                    id="feedback-screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />
                </Label>
              )}
            </div>

          </div>

          {/* Footer with Actions */}
          <div className="border-t border-border/50 bg-muted/30 p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim() || message.length < 10}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


