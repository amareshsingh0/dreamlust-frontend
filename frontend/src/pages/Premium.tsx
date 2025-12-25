import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Star, Check, Zap, Crown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Premium = () => {
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
      name: 'Basic',
      price: '$9.99',
      period: 'month',
      features: features.slice(0, 4),
      popular: false,
    },
    {
      name: 'Premium',
      price: '$19.99',
      period: 'month',
      features: features.slice(0, 6),
      popular: true,
    },
    {
      name: 'Pro',
      price: '$29.99',
      period: 'month',
      features: features,
      popular: false,
    },
  ];

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={plan.popular ? "border-primary border-2 relative" : ""}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
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
                  >
                    {plan.popular ? (
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
              <Button size="lg">
                <Star className="h-4 w-4 mr-2" />
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

