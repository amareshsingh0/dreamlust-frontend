import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service - PassionFantasia</title>
        <meta name="description" content="Read the PassionFantasia Terms of Service. Understand your rights and responsibilities." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto prose prose-invert">
            <h1 className="font-display text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 15, 2025</p>

            <div className="space-y-8 text-foreground">
              <section>
                <h2 className="font-display text-xl font-bold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using PassionFantasia ("the Service"), you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our Service.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">2. Eligibility</h2>
                <p className="text-muted-foreground">
                  You must be at least 18 years old to use this Service. By using PassionFantasia, you represent and 
                  warrant that you meet this age requirement and have the legal capacity to enter into these terms.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">3. User Accounts</h2>
                <p className="text-muted-foreground mb-4">
                  When you create an account, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">4. Content Guidelines</h2>
                <p className="text-muted-foreground mb-4">
                  Users and creators must adhere to our content guidelines. Prohibited content includes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Content that violates any applicable laws</li>
                  <li>Content involving minors</li>
                  <li>Non-consensual content</li>
                  <li>Content that infringes on intellectual property rights</li>
                  <li>Harassment, hate speech, or discriminatory content</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">5. Intellectual Property</h2>
                <p className="text-muted-foreground">
                  All content on PassionFantasia is protected by copyright and other intellectual property laws. 
                  Creators retain ownership of their content but grant PassionFantasia a license to host and distribute it.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">6. Payment Terms</h2>
                <p className="text-muted-foreground">
                  Subscription fees are billed in advance. All payments are non-refundable except as required by law. 
                  We reserve the right to change pricing with 30 days notice.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">7. Termination</h2>
                <p className="text-muted-foreground">
                  We may suspend or terminate your account for violations of these terms. You may delete your account 
                  at any time through your account settings.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">8. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms, contact us at legal@passionfantasia.com
                </p>
              </section>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Terms;
