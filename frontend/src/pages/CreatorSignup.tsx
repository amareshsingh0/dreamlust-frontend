import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, DollarSign, BarChart3, Users, Star, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  { icon: DollarSign, title: "Earn Money", description: "Multiple revenue streams including subscriptions, tips, and PPV content" },
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track your performance with detailed insights and metrics" },
  { icon: Users, title: "Build Your Audience", description: "Connect with millions of potential fans worldwide" },
  { icon: Star, title: "Creator Support", description: "Dedicated support team and resources to help you succeed" },
  { icon: Shield, title: "Content Protection", description: "Advanced tools to protect your content from unauthorized use" },
  { icon: Zap, title: "Fast Payouts", description: "Weekly payouts with multiple payment options available" },
];

const CreatorSignup = () => {
  return (
    <>
      <Helmet>
        <title>Become a Creator - PassionFantasia</title>
        <meta name="description" content="Join PassionFantasia as a creator. Share your content and earn money doing what you love." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-6">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold mb-6">
              Become a <span className="gradient-text">Creator</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Share your passion with the world and build a thriving community around your content.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="p-6 rounded-xl bg-card border border-border">
                <benefit.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Application Form */}
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-xl bg-card border border-border">
              <h2 className="font-display text-2xl font-bold mb-6 text-center">Apply to Become a Creator</h2>
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="creator-first-name" className="text-sm font-medium mb-2 block">First Name</label>
                    <Input id="creator-first-name" name="creator-first-name" placeholder="John" />
                  </div>
                  <div>
                    <label htmlFor="creator-last-name" className="text-sm font-medium mb-2 block">Last Name</label>
                    <Input id="creator-last-name" name="creator-last-name" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label htmlFor="creator-email" className="text-sm font-medium mb-2 block">Email</label>
                  <Input id="creator-email" name="creator-email" type="email" placeholder="your@email.com" />
                </div>
                <div>
                  <label htmlFor="creator-username" className="text-sm font-medium mb-2 block">Username</label>
                  <Input id="creator-username" name="creator-username" placeholder="Your creator username" />
                </div>
                <div>
                  <label htmlFor="creator-social" className="text-sm font-medium mb-2 block">Social Media Links</label>
                  <Input id="creator-social" name="creator-social" placeholder="Instagram, Twitter, YouTube, etc." />
                </div>
                <div>
                  <label htmlFor="creator-bio" className="text-sm font-medium mb-2 block">Tell us about yourself</label>
                  <Textarea id="creator-bio" name="creator-bio" placeholder="What type of content do you create? What makes you unique?" rows={4} />
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" id="terms" className="mt-1" />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
                    <Link to="/guidelines" className="text-primary hover:underline">Creator Guidelines</Link>
                  </label>
                </div>
                <Button type="submit" className="w-full" size="lg">Submit Application</Button>
              </form>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default CreatorSignup;
