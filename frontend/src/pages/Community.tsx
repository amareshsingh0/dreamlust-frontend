import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Trophy, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const communityFeatures = [
  {
    icon: MessageCircle,
    title: "Discussion Forums",
    description: "Connect with fellow viewers and creators in topic-based discussions.",
  },
  {
    icon: Users,
    title: "Creator Collabs",
    description: "Find collaboration partners and build your network.",
  },
  {
    icon: Trophy,
    title: "Challenges & Events",
    description: "Participate in community challenges and win exclusive prizes.",
  },
  {
    icon: Calendar,
    title: "Live Events",
    description: "Join live Q&As, premieres, and special community gatherings.",
  },
];

const Community = () => {
  return (
    <>
      <Helmet>
        <title>Community - Dreamlust</title>
        <meta name="description" content="Join the Dreamlust community. Connect with creators and viewers worldwide." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Join 2M+ community members</span>
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold mb-6">
              Welcome to the <span className="gradient-text">Dreamlust Community</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connect with creators, discover new content, and be part of something special.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg">Join Community</Button>
              <Button size="lg" variant="outline">Browse Discussions</Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {communityFeatures.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border text-center"
              >
                <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Community Guidelines CTA */}
          <div className="text-center p-8 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border">
            <h2 className="font-display text-2xl font-bold mb-3">Community Guidelines</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              We're committed to creating a safe, inclusive space for everyone. Please review our community guidelines.
            </p>
            <Button variant="outline" asChild>
              <Link to="/guidelines">Read Guidelines</Link>
            </Button>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Community;
