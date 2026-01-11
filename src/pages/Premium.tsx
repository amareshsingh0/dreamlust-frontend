import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Star, Check, Zap, Crown, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionResponse {
  subscription: {
    id: string;
    plan: string;
    status: string;
  };
  shortUrl?: string;
  subscriptionId: string;
}

const Premium = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  const features = [
    'Ad-free experience',
    'Exclusive premium content',
    'HD & 4K streaming',
    'Download for offline viewing',
    'Early access to new releases',
    'Priority customer support',
    'Creator badges',
    'Advanced analytics',
  ];

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '999',
      displayPrice: '999',
      currency: 'INR',
      period: 'month',
      features: features.slice(0, 4),
      popular: false,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '1999',
      displayPrice: '1,999',
      currency: 'INR',
      period: 'month',
      features: features.slice(0, 6),
      popular: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '2999',
      displayPrice: '2,999',
      currency: 'INR',
      period: 'month',
      features: features,
      popular: false,
    },
  ];

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch current subscription
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentSubscription();
    }
  }, [isAuthenticated]);

  const fetchCurrentSubscription = async () => {
    try {
      const response = await api.subscriptions.getAll<{ data: Array<{ plan: string; status: string }> }>();
      if (response.success && response.data?.data) {
        const activeSubscription = response.data.data.find(sub => sub.status === 'active');
        if (activeSubscription) {
          setCurrentPlan(activeSubscription.plan);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to subscribe to a plan',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (currentPlan === planId) {
      toast({
        title: 'Already subscribed',
        description: 'You are already subscribed to this plan',
      });
      return;
    }

    setLoadingPlan(planId);

    try {
      const response = await api.subscriptions.create<SubscriptionResponse>({ plan: planId });

      if (response.success && response.data) {
        // If Razorpay returns a short URL, redirect to it for payment
        if (response.data.shortUrl) {
          window.location.href = response.data.shortUrl;
        } else {
          // Subscription created successfully (might be free trial or direct activation)
          toast({
            title: 'Subscription activated!',
            description: `You are now subscribed to the ${planId} plan`,
          });
          setCurrentPlan(planId);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to create subscription');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription failed',
        description: error.message || 'Failed to process subscription',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Go Premium - PassionFantasia</title>
        <meta name="description" content="Upgrade to Premium for exclusive features" />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="h-10 w-10 text-primary" />
              <h1 className="text-5xl font-display font-bold">Go Premium</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Unlock exclusive content, features, and support your favorite creators
            </p>
            {currentPlan && (
              <Badge className="mt-4" variant="secondary">
                Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`${plan.popular ? "border-primary border-2 relative" : ""} ${currentPlan === plan.id ? "ring-2 ring-green-500" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                {currentPlan === plan.id && (
                  <Badge className="absolute -top-3 right-4 bg-green-500">
                    Current Plan
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.currency === 'INR' ? '₹' : '$'}{plan.displayPrice}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan !== null || currentPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : currentPlan === plan.id ? (
                      'Current Plan'
                    ) : plan.popular ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade Now
                      </>
                    ) : (
                      'Choose Plan'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Special Offer</h2>
              <p className="text-muted-foreground mb-4">
                Get 30% off your first 3 months when you upgrade today!
              </p>
              <Button
                size="lg"
                onClick={() => handleSubscribe('premium')}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === 'premium' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Star className="h-4 w-4 mr-2" />
                )}
                Claim Offer
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
};

export default Premium;
