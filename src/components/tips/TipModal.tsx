import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Heart, DollarSign, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
}

const PRESET_AMOUNTS = [10, 50, 100, 200, 500, 1000];

export function TipModal({ open, onOpenChange, creatorId, creatorName }: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'amount' | 'payment'>('amount');
  const [paymentOrder, setPaymentOrder] = useState<{ orderId: string; amount: number; currency: string; key: string; tipId: string } | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getAmount = (): number | null => {
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) || parsed <= 0 ? null : parsed;
    }
    return null;
  };

  const handleContinueToPayment = async () => {
    // Check if user is authenticated
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Please log in to send a tip. You need to be signed in to support creators.');
      return;
    }

    const amount = getAmount();
    if (!amount || amount <= 0) {
      toast.error('Please select or enter a valid tip amount.');
      return;
    }

    if (amount > 10000) {
      toast.error('Maximum tip amount is ₹10,000.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create tip and get Razorpay payment order
      const response = await api.tips.create({
        toCreatorId: creatorId,
        amount: amount,
        currency: 'INR', // Use INR for Razorpay
        message: message.trim() || undefined,
        isAnonymous: isAnonymous,
      });

      if (!response.success || !response.data) {
        // Handle authentication errors specifically
        if (response.error?.code === 'UNAUTHORIZED' || response.error?.message?.includes('authorization')) {
          toast.error('Your session has expired. Please log in again to send a tip.');
          // Clear invalid token
          localStorage.removeItem('accessToken');
          return;
        }
        throw new Error(response.error?.message || 'Failed to create tip');
      }

      const { tip, paymentOrder: order, message: responseMessage } = response.data as any;

      // In development mode, tips may auto-complete without payment
      if (!order || !order.orderId) {
        // Check if tip was auto-completed (dev mode)
        if (tip && (tip.status === 'completed' || tip.status === 'COMPLETED')) {
          toast.success(`Tip sent successfully! ${responseMessage || '(Development mode)'}`);
          // Reset form state
          setSelectedAmount(null);
          setCustomAmount('');
          setMessage('');
          setIsAnonymous(false);
          setStep('amount');
          setPaymentOrder(null);
          onOpenChange(false);
          return;
        }
        throw new Error('Payment order not received');
      }

      setPaymentOrder({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        key: order.key,
        tipId: tip.id,
      });
      setStep('payment');
    } catch (error: any) {
      console.error('Tip creation error:', error);
      // Handle network errors
      if (error?.error?.code === 'NETWORK_ERROR') {
        toast.error('Unable to connect to the server. Please check your internet connection and try again.');
      } else if (error?.error?.code === 'UNAUTHORIZED' || error?.error?.message?.includes('authorization')) {
        toast.error('Please log in to send a tip.');
      } else {
        toast.error(error?.error?.message || error?.message || 'Failed to create payment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!paymentOrder) {
      toast.error('Payment order not found. Please try again.');
      return;
    }

    const amount = getAmount();
    if (!amount) {
      toast.error('Invalid amount');
      return;
    }

    // Check if Razorpay is already loaded
    if ((window as any).Razorpay) {
      openRazorpayCheckout();
      return;
    }

    // Load Razorpay script dynamically
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      // Script already exists, wait a bit and try again
      setTimeout(() => {
        if ((window as any).Razorpay) {
          openRazorpayCheckout();
        } else {
          toast.error('Razorpay script failed to load. Please refresh the page and try again.');
        }
      }, 500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).Razorpay) {
        openRazorpayCheckout();
      } else {
        toast.error('Razorpay failed to initialize. Please try again.');
      }
    };
    script.onerror = () => {
      toast.error('Failed to load Razorpay. Please check your internet connection and try again.');
    };
    document.body.appendChild(script);
  };

  const openRazorpayCheckout = () => {
    console.log('openRazorpayCheckout called');
    
    if (!paymentOrder) {
      console.error('paymentOrder is null in openRazorpayCheckout');
      toast.error('Payment order not found. Please try again.');
      return;
    }

    const amount = getAmount();
    if (!amount) {
      console.error('Invalid amount in openRazorpayCheckout');
      toast.error('Invalid amount');
      return;
    }

    if (!paymentOrder.key) {
      console.error('Razorpay key missing:', paymentOrder);
      toast.error('Razorpay key not configured. Please contact support.');
      return;
    }

    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) {
      console.error('Razorpay not available on window object');
      toast.error('Razorpay is not loaded. Please refresh the page.');
      return;
    }

    try {
      console.log('Creating Razorpay options:', {
        key: paymentOrder.key?.substring(0, 10) + '...',
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        order_id: paymentOrder.orderId,
      });

      const options = {
        key: paymentOrder.key,
        amount: paymentOrder.amount, // Amount in paise
        currency: paymentOrder.currency,
        name: 'PassionFantasia',
        description: `Tip to ${creatorName}`,
        order_id: paymentOrder.orderId,
        handler: async function (response: any) {
          console.log('Razorpay payment handler called:', response);
          try {
            // Verify payment with backend
            const verifyResponse = await api.razorpay.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyResponse.success) {
              // Confirm tip payment
              const confirmResponse = await api.tips.confirmPayment(paymentOrder.tipId, {
                paymentIntentId: response.razorpay_payment_id,
              });

              if (confirmResponse.success) {
                toast.success(`Your ₹${amount.toFixed(2)} tip has been sent to ${creatorName}!`);
                handleClose();
              } else {
                throw new Error(confirmResponse.error?.message || 'Payment confirmation failed');
              }
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error?.error?.message || error?.message || 'Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: '', // Will be filled from user profile if available
          email: '', // Will be filled from user profile if available
        },
        theme: {
          color: '#6366f1', // Primary color
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay modal dismissed by user');
            toast.info('Payment cancelled');
          },
        },
      };

      console.log('Instantiating Razorpay...');
      const razorpay = new Razorpay(options);
      console.log('Razorpay instance created, opening checkout...');
      razorpay.open();
      console.log('razorpay.open() called - payment modal should be opening');
    } catch (error: any) {
      console.error('Razorpay checkout error:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        paymentOrder: paymentOrder,
        RazorpayAvailable: !!(window as any).Razorpay,
      });
      toast.error(error?.message || 'Failed to open payment window. Please refresh the page and try again.');
    }
  };

  const handleClose = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setMessage('');
    setIsAnonymous(false);
    setStep('amount');
    setPaymentOrder(null);
    onOpenChange(false);
  };

  const amount = getAmount();

  // Reset to amount step when modal closes
  useEffect(() => {
    if (!open) {
      setStep('amount');
      setPaymentOrder(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[580px] lg:max-w-[640px] w-[95vw] max-h-[95vh] min-h-[500px] flex flex-col p-0 mx-2 sm:mx-4 overflow-hidden shadow-2xl border-2 border-primary/20">
        <DialogHeader className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 lg:pt-8 pb-4 sm:pb-5 flex-shrink-0 bg-gradient-to-b from-background via-background to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {step === 'payment' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep('amount')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl font-bold">
                <div className="relative group">
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary fill-primary animate-pulse group-hover:scale-110 transition-transform" />
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 absolute -top-1 -right-1 text-accent animate-ping" />
                </div>
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {step === 'payment' ? 'Complete Payment' : `Tip ${creatorName}`}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm lg:text-base mt-2 sm:mt-3 leading-relaxed">
                {step === 'payment' 
                  ? 'Enter your payment details to complete the tip.'
                  : 'Show your appreciation by sending a tip. Your support helps creators continue making great content.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5 lg:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 overflow-y-auto flex-1 min-h-0 scrollbar-hide">
          {step === 'amount' ? (
            <>
          {/* Preset Amounts */}
          <div className="space-y-3 sm:space-y-4">
            <div className="text-sm sm:text-base lg:text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Select Amount
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={selectedAmount === preset ? 'default' : 'outline'}
                  onClick={() => handleAmountSelect(preset)}
                  disabled={isSubmitting}
                  className={cn(
                    "h-14 sm:h-16 lg:h-18 text-sm sm:text-base lg:text-lg font-bold transition-all duration-300",
                    "hover:scale-105 active:scale-95 hover:shadow-lg",
                    "min-h-[56px] sm:min-h-[64px]",
                    selectedAmount === preset 
                      ? "bg-gradient-to-r from-primary via-primary/90 to-accent text-white shadow-xl shadow-primary/40 border-2 border-primary/50 ring-2 ring-primary/20" 
                      : "hover:border-primary/60 hover:bg-muted/60 hover:text-primary border-2"
                  )}
                >
                  <span className="flex items-center gap-1">
                    <span className="text-xs">₹</span>
                    {preset}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="custom-amount" className="text-sm sm:text-base lg:text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Custom Amount
            </Label>
            <div className="relative group">
              <DollarSign className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-focus-within:text-primary transition-all duration-200 group-focus-within:scale-110" />
              <Input
                id="custom-amount"
                name="custom-amount"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                disabled={isSubmitting || selectedAmount !== null}
                className="pl-12 sm:pl-14 lg:pl-16 h-14 sm:h-16 lg:h-18 text-base sm:text-lg lg:text-xl font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all min-h-[56px] sm:min-h-[64px] border-2"
              />
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
              Minimum ₹0.01 • Maximum ₹10,000
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="tip-message" className="text-sm sm:text-base lg:text-lg font-bold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Message <span className="text-xs sm:text-sm font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="tip-message"
              name="tip-message"
              placeholder="Leave a message for the creator..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              maxLength={500}
              className="resize-none focus:ring-2 focus:ring-primary/30 transition-all text-sm sm:text-base lg:text-lg border-2 min-h-[100px] sm:min-h-[120px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                {message.length}/500 characters
              </p>
              {message.length > 450 && (
                <p className="text-xs sm:text-sm text-primary font-medium animate-pulse">
                  {500 - message.length} characters left
                </p>
              )}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 rounded-xl border-2 border-border/50 bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
            <div className="space-y-1 sm:space-y-1.5 flex-1 pr-4 sm:pr-6">
              <Label htmlFor="anonymous" className="text-sm sm:text-base lg:text-lg font-bold cursor-pointer flex items-center gap-2 group-hover:text-primary transition-colors">
                <span className="relative">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  {isAnonymous && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-ping"></span>
                  )}
                </span>
                Send Anonymously
              </Label>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1 leading-relaxed">
                Your name will be hidden from the creator
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              disabled={isSubmitting}
              className="flex-shrink-0 scale-110 sm:scale-125"
            />
          </div>
            </>
          ) : paymentOrder ? (
            <div className="space-y-4">
              <div className="p-6 rounded-xl border-2 border-border/50 bg-muted/30">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-lg font-semibold mb-2">Ready to send your tip!</p>
                    <p className="text-sm text-muted-foreground">
                      Click the button below to complete your payment securely with Razorpay
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-2xl font-bold text-primary">
                      ₹{paymentOrder.amount / 100}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Amount to be paid</p>
                  </div>
                  <Button
                    onClick={async () => {
                      console.log('Pay button clicked, paymentOrder:', paymentOrder);
                      if (!paymentOrder) {
                        toast.error('Payment order not available. Please try again.');
                        return;
                      }
                      if (!paymentOrder.key) {
                        toast.error('Razorpay key not configured. Please contact support.');
                        return;
                      }
                      try {
                        await handleRazorpayPayment();
                      } catch (error: any) {
                        console.error('Payment button error:', error);
                        toast.error(error?.message || 'Failed to open payment. Please try again.');
                      }
                    }}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary via-primary/95 to-accent hover:from-primary/95 hover:via-primary/90 hover:to-accent/95 text-white shadow-xl shadow-primary/40"
                    size="lg"
                    disabled={!paymentOrder || !paymentOrder.key}
                  >
                    <Heart className="h-5 w-5 mr-2 fill-current" />
                    {paymentOrder?.key ? 'Pay with Razorpay' : 'Loading Payment...'}
                  </Button>
                  {!paymentOrder?.key && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Waiting for payment configuration...
                    </p>
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Secure payment processed by Razorpay
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky Footer with Actions */}
        <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 pt-4 sm:pt-5 border-t-2 border-border/50 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-md flex-shrink-0 space-y-3 sm:space-y-4 sticky bottom-0">
          {amount && (
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/10 to-accent/15 shadow-2xl shadow-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary" />
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-foreground/90">Total Amount</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent block leading-tight">
                    ₹{amount.toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground font-medium">INR</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {step === 'amount' ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 w-full sm:w-auto h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-lg font-bold hover:bg-muted/80 hover:border-primary/50 transition-all duration-200 min-h-[48px] sm:min-h-[56px] border-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContinueToPayment}
                  disabled={!amount || isSubmitting}
                  className="flex-1 w-full sm:w-auto h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-primary via-primary/95 to-accent hover:from-primary/95 hover:via-primary/90 hover:to-accent/95 text-white shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px] sm:min-h-[56px] border-2 border-primary/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 mr-2 fill-current" />
                      <span>Continue to Payment</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full h-12 sm:h-14 text-sm sm:text-base lg:text-lg font-bold hover:bg-muted/80 hover:border-primary/50 transition-all duration-200 min-h-[48px] sm:min-h-[56px] border-2"
              >
                Cancel Payment
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 sm:gap-3 pt-2">
            <div className="flex-shrink-0 mt-1">
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary/60 animate-pulse"></div>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-center text-muted-foreground leading-relaxed flex-1">
              Payment will be processed securely. You'll receive a confirmation once the tip is sent.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

