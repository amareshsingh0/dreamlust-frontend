import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice } from "@/lib/preferences/currencyHelper";

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId?: string; // Legacy Stripe
  razorpayPlanId?: string; // Razorpay Plan ID
  currency: string;
  interval: string;
  features: string[];
  popular?: boolean;
  isSubscribed?: boolean;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
}

const SubscriptionPlans = () => {
  const { user } = useAuth();
  const { currency } = useLocale();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    // Track subscription viewed event
    if (user) {
      api.analytics.track('subscription_viewed', {
        timestamp: new Date().toISOString(),
      }).catch(() => {}); // Non-blocking
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.plans.getAll<Plan[]>();
      if (response.success && response.data) {
        setPlans(response.data as Plan[]);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPlan = async (planId: string, plan: Plan) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      navigate("/auth?redirect=/subscription-plans");
      return;
    }

    if (plan.price === 0) {
      // Free plan - no payment needed
      toast.success(`You're already on the ${plan.name} plan!`);
      return;
    }

    if (!plan.razorpayPlanId) {
      toast.error("Plan Razorpay ID not configured");
      return;
    }

    if (plan.isSubscribed) {
      toast.info(`You're already subscribed to the ${plan.name} plan`);
      return;
    }

    try {
      setSubscribing(planId);
      
      console.log('Creating Razorpay checkout for plan:', planId);
      
      // Create Razorpay checkout (like Stripe pattern)
      const response = await api.razorpay.createCheckout<{ url: string }>({
        planId: planId,
      });

      console.log('Razorpay checkout response:', response);

      if (response.success && response.data?.url) {
        console.log('Redirecting to Razorpay URL:', response.data.url);
        // Redirect to Razorpay subscription page
        // Direct redirect works better for Razorpay subscription links
        window.location.href = response.data.url;
      } else {
        console.error('Failed to create checkout:', response);
        console.error('Response error:', response.error);
        toast.error(response.error?.message || "Failed to create subscription. Please check console for details.");
        setSubscribing(null);
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error?.error?.message || error?.message || "Failed to subscribe");
      setSubscribing(null);
    }
  };

  // Find current plan for potential future use
  const _currentPlan = plans.find((p) => p.isSubscribed);
  void _currentPlan; // Suppress unused variable warning

  if (loading) {
    return (
      <Layout>
        <Helmet>
          <title>Subscription Plans - PassionFantasia</title>
        </Helmet>
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Subscription Plans - PassionFantasia</title>
        <meta name="description" content="Choose the perfect subscription plan for you" />
      </Helmet>
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-muted-foreground text-lg">
              Select the perfect plan for your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const isCurrentPlan = plan.isSubscribed;
              const isSubscribing = subscribing === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    plan.popular
                      ? "border-primary shadow-lg scale-105"
                      : "border-border"
                  }`}
                >
                  {plan.popular && (
                    <Badge
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                      variant="default"
                    >
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge
                      className="absolute -top-3 right-4"
                      variant="secondary"
                    >
                      Current Plan
                    </Badge>
                  )}

                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">
                          {plan.price === 0
                            ? "Free"
                            : formatPrice(plan.price, currency)}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-muted-foreground">
                            /{plan.interval}
                          </span>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => subscribeToPlan(plan.id, plan)}
                      disabled={isSubscribing || isCurrentPlan}
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        "Current Plan"
                      ) : plan.price === 0 ? (
                        "Free Forever"
                      ) : (
                        "Upgrade"
                      )}
                    </Button>

                    {isCurrentPlan && plan.currentPeriodEnd && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Renews on{" "}
                        {new Date(plan.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              All plans include a 30-day money-back guarantee. Cancel anytime.
            </p>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default SubscriptionPlans;
