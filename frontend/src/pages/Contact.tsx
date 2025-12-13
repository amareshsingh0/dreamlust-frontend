import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, MapPin, Clock } from "lucide-react";

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact Us - Dreamlust</title>
        <meta name="description" content="Get in touch with the Dreamlust team. We're here to help." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="font-display text-4xl font-bold mb-4">Contact Us</h1>
              <p className="text-muted-foreground">
                Have a question or feedback? We'd love to hear from you.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <Mail className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">support@dreamlust.com</p>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <MessageCircle className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Live Chat</h3>
                  <p className="text-sm text-muted-foreground">Available 24/7 for Premium users</p>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <Clock className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Response Time</h3>
                  <p className="text-sm text-muted-foreground">Usually within 24 hours</p>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <MapPin className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Office</h3>
                  <p className="text-sm text-muted-foreground">San Francisco, CA</p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2 p-8 rounded-xl bg-card border border-border">
                <h2 className="font-display text-xl font-bold mb-6">Send us a message</h2>
                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input placeholder="Your name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <Input type="email" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input placeholder="How can we help?" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea placeholder="Tell us more..." rows={6} />
                  </div>
                  <Button type="submit" className="w-full">Send Message</Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Contact;
