/**
 * Cancellation Flow Component
 * Handles subscription cancellation with survey and retention offers
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { X, Gift, Pause, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface CancellationFlowProps {
  subscriptionId: string;
  planPrice?: number;
  onCancel?: () => void;
  onClose?: () => void;
}

const CANCEL_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: 'Not using enough' },
  { value: 'missing_features', label: 'Missing features' },
  { value: 'technical_issues', label: 'Technical problems' },
  { value: 'found_alternative', label: 'Found alternative' },
  { value: 'other', label: 'Other' },
];

export function CancellationFlow({ subscriptionId, planPrice: _planPrice, onCancel, onClose }: CancellationFlowProps) {
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  const handleSubmit = async (acceptOffer: boolean = false) => {
    if (!cancelReason && !acceptOffer) {
      toast({
        title: 'Please select a reason',
        description: 'Help us improve by telling us why you\'re canceling',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.subscriptionManagement.cancel({
        subscriptionId,
        cancelReason,
        feedback,
        acceptOffer,
      });

      if (response.success) {
        if (acceptOffer) {
          toast({
            title: 'Offer Accepted!',
            description: 'Your subscription will continue with the special offer.',
          });
        } else {
          toast({
            title: 'Subscription Canceled',
            description: 'Your subscription will end at the current period.',
          });
        }
        if (onCancel) onCancel();
        if (onClose) onClose();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process cancellation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCancel = () => {
    setShowFinalConfirm(true);
  };

  const confirmCancellation = () => {
    handleSubmit(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cancel Subscription</CardTitle>
            <CardDescription>We're sorry to see you go. Help us improve by sharing your feedback.</CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!showFinalConfirm ? (
          <>
            {/* Cancellation Survey */}
            <div className="space-y-4">
              <Label>Why are you canceling?</Label>
              <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
                {CANCEL_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Additional feedback (optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Tell us more about your experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>

            {/* Retention Offers */}
            {cancelReason && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Before you go...</h4>

                {cancelReason === 'too_expensive' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Gift className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">Special Offer: 50% Off for 3 Months</h4>
                            <Badge variant="secondary">Limited Time</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            We'd love to keep you! Get 50% off your next 3 months.
                          </p>
                          <Button onClick={() => handleSubmit(true)} className="w-full">
                            Accept Offer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {cancelReason === 'not_using' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Pause className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Pause Instead?</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Take a break for up to 3 months without losing your data or preferences.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement pause functionality
                              toast({
                                title: 'Pause Feature',
                                description: 'Pause functionality coming soon',
                              });
                            }}
                            className="w-full"
                          >
                            Pause Subscription
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {cancelReason === 'missing_features' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <MessageSquare className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">What Features Are You Looking For?</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Tell us what's missing and we'll notify you when we add it.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement feature request
                              toast({
                                title: 'Feature Request',
                                description: 'Thank you for your feedback!',
                              });
                            }}
                            className="w-full"
                          >
                            Send Feedback
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Final Cancel Button */}
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleFinalCancel}
                disabled={loading || !cancelReason}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Yes, Cancel My Subscription'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold">Are you sure?</h3>
            <p className="text-muted-foreground">
              Your subscription will be canceled at the end of the current billing period.
              You'll continue to have access until then.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinalConfirm(false)}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancellation}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


