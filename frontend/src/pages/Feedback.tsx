import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { MessageSquare, ArrowLeft, Upload, Loader2, Sparkles, AlertCircle, Lightbulb, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Feedback() {
  const [type, setType] = useState<'bug_report' | 'feature_request' | 'general_feedback'>('general_feedback');
  const [message, setMessage] = useState('');
  const [_screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const feedbackTypes = [
    {
      value: 'bug_report' as const,
      label: 'Bug Report',
      description: 'Report an issue or error',
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      value: 'feature_request' as const,
      label: 'Feature Request',
      description: 'Suggest a new feature',
      icon: Lightbulb,
      color: 'text-yellow-500',
    },
    {
      value: 'general_feedback' as const,
      label: 'General Feedback',
      description: 'Share your thoughts',
      icon: MessageCircle,
      color: 'text-blue-500',
    },
  ];

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Screenshot must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setScreenshot(file);
    const preview = URL.createObjectURL(file);
    setScreenshotPreview(preview);

    try {
      const response = await api.feedback.uploadScreenshot<{ url: string }>(file);
      if (response.success && response.data?.url) {
        setScreenshotUrl(response.data.url);
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload screenshot. You can still submit feedback without it.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please provide feedback message',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.feedback.submit({
        type,
        message: message.trim(),
        screenshotUrl: screenshotUrl || undefined,
      } as Parameters<typeof api.feedback.submit>[0]);

      if (response.success) {
        toast({
          title: 'Thank you!',
          description: 'Your feedback has been submitted successfully.',
        });

        // Reset form
        setMessage('');
        setScreenshot(null);
        setScreenshotPreview(null);
        setScreenshotUrl(null);
        setType('general_feedback');
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
      <Helmet>
        <title>Feedback - PassionFantasia</title>
        <meta name="description" content="Share your feedback, report bugs, or request features" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Feedback</h1>
                <p className="text-muted-foreground mt-1">
                  Share your thoughts, report bugs, or suggest features
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-card rounded-lg border border-border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type Selection */}
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

              {/* Message */}
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
                  className="resize-none"
                  required
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label htmlFor="feedback-screenshot" className="text-sm font-semibold">
                  Screenshot (Optional)
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="feedback-screenshot"
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Upload Screenshot</span>
                  </label>
                  <input
                    type="file"
                    id="feedback-screenshot"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />
                  {screenshotPreview && (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="h-20 w-auto rounded border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshot(null);
                          setScreenshotPreview(null);
                          setScreenshotUrl(null);
                        }}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/90"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h2 className="font-semibold mb-2">How we use your feedback</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Bug reports help us fix issues quickly</li>
              <li>• Feature requests guide our product roadmap</li>
              <li>• General feedback helps us improve your experience</li>
              <li>• All feedback is reviewed by our team</li>
            </ul>
          </div>
        </div>
      </Layout>
    </>
  );
}

