import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";

const Privacy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - PassionFantasia</title>
        <meta name="description" content="Learn how PassionFantasia collects, uses, and protects your personal information." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 15, 2025</p>

            <div className="space-y-8">
              <section>
                <h2 className="font-display text-xl font-bold mb-4">Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Account information (email, username, profile details)</li>
                  <li>Payment information (processed securely via third-party providers)</li>
                  <li>Content you upload or create</li>
                  <li>Communications with our support team</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Automatically Collected Information</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Device information and identifiers</li>
                  <li>IP address and location data</li>
                  <li>Browsing history and watch history</li>
                  <li>Cookies and similar technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">How We Use Your Information</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide and improve our services</li>
                  <li>Personalize your experience and recommendations</li>
                  <li>Process payments and prevent fraud</li>
                  <li>Communicate with you about updates and promotions</li>
                  <li>Ensure platform safety and enforce our policies</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Data Sharing</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal information. We may share data with:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Service providers who help operate our platform</li>
                  <li>Law enforcement when required by law</li>
                  <li>Business partners with your consent</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Your Privacy Controls</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Access and download your data</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Control cookie preferences</li>
                  <li>Enable anonymous browsing mode</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Data Security</h2>
                <p className="text-muted-foreground">
                  We implement industry-standard security measures including encryption, secure data centers, 
                  and regular security audits to protect your information.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  For privacy-related inquiries, contact our Data Protection Officer at privacy@passionfantasia.com
                </p>
              </section>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Privacy;
