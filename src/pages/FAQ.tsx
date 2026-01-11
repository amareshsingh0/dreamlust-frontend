import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click the 'Sign Up' button in the top right corner. You can register using your email address or sign in with Google, Apple, or other social accounts."
      },
      {
        q: "Is PassionFantasia free to use?",
        a: "Yes! PassionFantasia offers a free tier with access to a wide range of content. Premium subscriptions unlock exclusive content, higher quality streams, and ad-free viewing."
      },
      {
        q: "What devices can I use to watch content?",
        a: "PassionFantasia works on web browsers, iOS and Android mobile apps, smart TVs, gaming consoles, and streaming devices like Roku and Fire TV."
      },
    ]
  },
  {
    category: "Account & Billing",
    questions: [
      {
        q: "How do I upgrade to Premium?",
        a: "Go to your Profile > Settings > Subscription and choose the plan that's right for you. We accept all major credit cards and PayPal."
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
      },
      {
        q: "How do I update my payment method?",
        a: "Navigate to Profile > Settings > Payment Methods. You can add, remove, or update your payment information there."
      },
    ]
  },
  {
    category: "Content & Creators",
    questions: [
      {
        q: "How do I become a creator?",
        a: "Click 'Become a Creator' in the footer or your profile menu. Complete the application process, verify your identity, and you're ready to start uploading!"
      },
      {
        q: "How do creators earn money?",
        a: "Creators earn through ad revenue, premium subscriptions, tips from viewers, and exclusive content sales. Our monetization program offers competitive rates."
      },
      {
        q: "How do I report inappropriate content?",
        a: "Click the three dots menu on any content and select 'Report'. Our moderation team reviews all reports within 24 hours."
      },
    ]
  },
  {
    category: "Technical Issues",
    questions: [
      {
        q: "Why is my video buffering?",
        a: "Buffering is usually caused by slow internet connection. Try lowering the video quality in settings, or check your internet speed. We recommend at least 5 Mbps for HD streaming."
      },
      {
        q: "How do I change video quality?",
        a: "Click the gear icon on the video player and select your preferred quality. You can also set a default quality in your account settings."
      },
      {
        q: "The app is crashing. What should I do?",
        a: "Try clearing the app cache, updating to the latest version, or reinstalling the app. If issues persist, contact our support team."
      },
    ]
  },
];

const FAQ = () => {
  return (
    <>
      <Helmet>
        <title>FAQ - PassionFantasia</title>
        <meta name="description" content="Frequently asked questions about PassionFantasia. Find answers to common questions." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="font-display text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-muted-foreground">
                Find quick answers to common questions
              </p>
            </div>

            {/* FAQ Categories */}
            <div className="space-y-8">
              {faqData.map((category) => (
                <div key={category.category}>
                  <h2 className="font-display text-xl font-bold mb-4">{category.category}</h2>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((item, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`${category.category}-${index}`}
                        className="bg-card border border-border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default FAQ;
