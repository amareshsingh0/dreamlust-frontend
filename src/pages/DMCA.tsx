import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield, AlertTriangle } from "lucide-react";

const DMCA = () => {
  return (
    <>
      <Helmet>
        <title>DMCA Policy - PassionFantasia</title>
        <meta name="description" content="PassionFantasia DMCA policy and copyright infringement reporting procedures." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="font-display text-4xl font-bold">DMCA Policy</h1>
            </div>
            <p className="text-muted-foreground mb-8">
              PassionFantasia respects the intellectual property rights of others and expects users to do the same.
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="font-display text-xl font-bold mb-4">Copyright Infringement Notice</h2>
                <p className="text-muted-foreground mb-4">
                  If you believe that content on PassionFantasia infringes your copyright, please submit a DMCA 
                  takedown notice containing the following information:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>A physical or electronic signature of the copyright owner</li>
                  <li>Identification of the copyrighted work claimed to be infringed</li>
                  <li>Identification of the infringing material with enough information to locate it</li>
                  <li>Your contact information (address, phone number, email)</li>
                  <li>A statement that you have a good faith belief that the use is not authorized</li>
                  <li>A statement, under penalty of perjury, that the information is accurate</li>
                </ul>
              </section>

              <section className="p-6 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive mb-2">Warning</h3>
                    <p className="text-sm text-muted-foreground">
                      Filing a false DMCA claim is punishable under federal law. Please ensure that you are 
                      the copyright holder or authorized to act on their behalf before submitting a claim.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Submit a DMCA Notice</h2>
                <form className="space-y-4 p-6 rounded-xl bg-card border border-border">
                  <div>
                    <label htmlFor="dmca-name" className="text-sm font-medium mb-2 block">Your Name</label>
                    <Input id="dmca-name" name="dmca-name" placeholder="Full legal name" />
                  </div>
                  <div>
                    <label htmlFor="dmca-email" className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input id="dmca-email" name="dmca-email" type="email" placeholder="your@email.com" />
                  </div>
                  <div>
                    <label htmlFor="dmca-content-urls" className="text-sm font-medium mb-2 block">Content URL(s)</label>
                    <Textarea id="dmca-content-urls" name="dmca-content-urls" placeholder="URLs of the infringing content (one per line)" rows={3} />
                  </div>
                  <div>
                    <label htmlFor="dmca-original-work" className="text-sm font-medium mb-2 block">Original Work</label>
                    <Textarea id="dmca-original-work" name="dmca-original-work" placeholder="Description or URL of your original copyrighted work" rows={3} />
                  </div>
                  <div>
                    <label htmlFor="dmca-additional-info" className="text-sm font-medium mb-2 block">Additional Information</label>
                    <Textarea id="dmca-additional-info" name="dmca-additional-info" placeholder="Any additional details" rows={3} />
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" id="declaration" className="mt-1" />
                    <label htmlFor="declaration" className="text-sm text-muted-foreground">
                      I declare under penalty of perjury that I am the copyright owner or authorized to act 
                      on behalf of the owner, and that the information provided is accurate.
                    </label>
                  </div>
                  <Button type="submit" className="w-full">Submit DMCA Notice</Button>
                </form>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4">Counter-Notification</h2>
                <p className="text-muted-foreground">
                  If you believe your content was removed in error, you may submit a counter-notification. 
                  Contact our legal team at dmca@passionfantasia.com for the counter-notification process.
                </p>
              </section>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default DMCA;
