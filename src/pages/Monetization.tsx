import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, Gift, Percent, Star } from "lucide-react";
import { Link } from "react-router-dom";

const revenueStreams = [
  {
    icon: CreditCard,
    title: "Subscriptions",
    description: "Earn recurring revenue from fans who subscribe to your exclusive content.",
    rate: "80% revenue share",
  },
  {
    icon: Gift,
    title: "Tips & Gifts",
    description: "Receive one-time tips and virtual gifts from appreciative viewers.",
    rate: "85% revenue share",
  },
  {
    icon: DollarSign,
    title: "Pay-Per-View",
    description: "Sell individual pieces of content at prices you set.",
    rate: "80% revenue share",
  },
  {
    icon: TrendingUp,
    title: "Ad Revenue",
    description: "Earn from ads displayed on your free content.",
    rate: "70% revenue share",
  },
];

const Monetization = () => {
  return (
    <>
      <Helmet>
        <title>Monetization - PassionFantasia</title>
        <meta name="description" content="Learn how to earn money as a PassionFantasia creator. Multiple revenue streams available." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-16">
              <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-6">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold mb-6">
                Monetize Your <span className="gradient-text">Content</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Turn your passion into profit with our industry-leading revenue share and multiple earning opportunities.
              </p>
            </div>

            {/* Revenue Streams */}
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {revenueStreams.map((stream) => (
                <div key={stream.title} className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <stream.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{stream.title}</h3>
                      <span className="text-sm text-primary font-medium">{stream.rate}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{stream.description}</p>
                </div>
              ))}
            </div>

            {/* Payout Info */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <div className="p-6 rounded-xl bg-muted text-center">
                <Percent className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-2xl mb-1">Up to 85%</h3>
                <p className="text-sm text-muted-foreground">Revenue Share</p>
              </div>
              <div className="p-6 rounded-xl bg-muted text-center">
                <CreditCard className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-2xl mb-1">Weekly</h3>
                <p className="text-sm text-muted-foreground">Payout Schedule</p>
              </div>
              <div className="p-6 rounded-xl bg-muted text-center">
                <Star className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-2xl mb-1">₹500</h3>
                <p className="text-sm text-muted-foreground">Minimum Payout</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center p-8 rounded-xl gradient-bg">
              <h2 className="font-display text-2xl font-bold text-primary-foreground mb-4">
                Ready to Start Earning?
              </h2>
              <p className="text-primary-foreground/80 mb-6">
                Join thousands of creators already earning on PassionFantasia.
              </p>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/creator-signup">Apply Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Monetization;
