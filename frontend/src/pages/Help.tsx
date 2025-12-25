import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Mail, FileText, Shield, CreditCard, Video, Users } from "lucide-react";
import { Link } from "react-router-dom";

const helpCategories = [
  {
    icon: Users,
    title: "Account & Profile",
    description: "Manage your account settings, profile, and preferences",
    articles: ["How to update your profile", "Password reset", "Two-factor authentication", "Delete account"],
  },
  {
    icon: Video,
    title: "Watching Content",
    description: "Learn about playback, quality settings, and downloads",
    articles: ["Video quality settings", "Offline viewing", "Playback issues", "Subtitles & captions"],
  },
  {
    icon: CreditCard,
    title: "Billing & Payments",
    description: "Subscription plans, payment methods, and billing history",
    articles: ["Subscription plans", "Payment methods", "Refund policy", "Cancel subscription"],
  },
  {
    icon: Shield,
    title: "Privacy & Safety",
    description: "Control your privacy settings and stay safe",
    articles: ["Privacy controls", "Block users", "Report content", "Data protection"],
  },
  {
    icon: FileText,
    title: "Creator Tools",
    description: "Upload, manage, and monetize your content",
    articles: ["Upload guidelines", "Monetization setup", "Analytics dashboard", "Content moderation"],
  },
  {
    icon: MessageCircle,
    title: "Community",
    description: "Engage with the community and other creators",
    articles: ["Community guidelines", "Comments & interactions", "Following creators", "Notifications"],
  },
];

const Help = () => {
  return (
    <>
      <Helmet>
        <title>Help Center - PassionFantasia</title>
        <meta name="description" content="Get help with your PassionFantasia account, content, billing, and more." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">How can we help?</h1>
            <p className="text-muted-foreground mb-8">
              Search our help center or browse categories below
            </p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="help-search-input"
                name="help-search-input"
                type="search"
                placeholder="Search for help..."
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {helpCategories.map((category) => (
              <div
                key={category.title}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-display font-semibold">{category.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                <ul className="space-y-2">
                  {category.articles.map((article) => (
                    <li key={article}>
                      <Link
                        to="#"
                        className="text-sm hover:text-primary transition-colors"
                      >
                        {article}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="text-center p-8 rounded-xl bg-muted">
            <h2 className="font-display text-xl font-bold mb-2">Still need help?</h2>
            <p className="text-muted-foreground mb-4">Our support team is available 24/7</p>
            <Button asChild>
              <Link to="/contact">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Help;
