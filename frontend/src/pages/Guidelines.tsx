import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { CheckCircle, XCircle } from "lucide-react";

const Guidelines = () => {
  const dos = [
    "Be respectful and professional in all interactions",
    "Obtain proper consent for all content featuring others",
    "Use accurate titles and descriptions for your content",
    "Respond to your audience and build genuine connections",
    "Report violations and help maintain community standards",
    "Follow all applicable laws and regulations",
    "Protect your account with strong security practices",
    "Credit collaborators and sources appropriately",
  ];

  const donts = [
    "Upload content involving minors in any context",
    "Share non-consensual or revenge content",
    "Impersonate other creators or individuals",
    "Engage in harassment, bullying, or hate speech",
    "Use deceptive practices to gain followers or views",
    "Spam or flood the platform with low-quality content",
    "Share personal information of others without consent",
    "Violate copyright or intellectual property rights",
  ];

  return (
    <>
      <Helmet>
        <title>Creator Guidelines - PassionFantasia</title>
        <meta name="description" content="Guidelines for PassionFantasia creators. Learn the rules and best practices for success." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-4">Creator Guidelines</h1>
            <p className="text-muted-foreground mb-8">
              These guidelines help maintain a safe, respectful, and thriving creator community.
            </p>

            <div className="space-y-12">
              {/* Do's */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  What to Do
                </h2>
                <div className="grid gap-3">
                  {dos.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Don'ts */}
              <section>
                <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
                  <XCircle className="h-6 w-6 text-destructive" />
                  What Not to Do
                </h2>
                <div className="grid gap-3">
                  {donts.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Enforcement */}
              <section className="p-6 rounded-xl bg-card border border-border">
                <h2 className="font-display text-xl font-bold mb-4">Enforcement</h2>
                <p className="text-muted-foreground mb-4">
                  Violations of these guidelines may result in:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Content removal</li>
                  <li>Temporary account suspension</li>
                  <li>Permanent account termination</li>
                  <li>Loss of monetization privileges</li>
                  <li>Legal action where applicable</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Guidelines;
