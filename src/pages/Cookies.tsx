import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Cookies = () => {
  return (
    <>
      <Helmet>
        <title>Cookie Policy - PassionFantasia</title>
        <meta name="description" content="Learn about how PassionFantasia uses cookies and similar technologies." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-2">Cookie Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 15, 2025</p>

            <div className="space-y-8">
              <section>
                <h2 className="font-display text-xl font-bold mb-4">What Are Cookies?</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files stored on your device when you visit our website. They help us 
                  provide a better experience by remembering your preferences and understanding how you use our service.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Types of Cookies We Use</h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <h3 className="font-semibold mb-2">Essential Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      Required for the website to function. They enable core features like security, account access, and preferences.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <h3 className="font-semibold mb-2">Analytics Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      Help us understand how visitors interact with our website, allowing us to improve our services.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <h3 className="font-semibold mb-2">Functional Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      Remember your choices and preferences, such as language settings and video quality preferences.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <h3 className="font-semibold mb-2">Marketing Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      Used to deliver relevant advertisements and track campaign performance. You can opt out of these.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Managing Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  You can control cookies through your browser settings or our cookie preference center. 
                  Note that disabling certain cookies may affect website functionality.
                </p>
                <Button variant="outline">Manage Cookie Preferences</Button>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Third-Party Cookies</h2>
                <p className="text-muted-foreground">
                  Some cookies are placed by third-party services that appear on our pages, such as video players, 
                  social sharing buttons, and analytics tools.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  Questions about our cookie policy? Contact us at{" "}
                  <Link to="/contact" className="text-primary hover:underline">our contact page</Link>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Cookies;
