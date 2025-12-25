import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, MapPin, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Contact Form Validation Schema
const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200, "Subject is too long"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message is too long"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.feedback.submit({
        type: "general_feedback",
        message: `Name: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\n${data.message}`,
        metadata: {
          contactName: data.name,
          contactEmail: data.email,
          subject: data.subject,
        },
      });

      if (response.success) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        reset();
      } else {
        toast.error(response.error?.message || "Failed to send message. Please try again.");
      }
    } catch (error) {
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <Helmet>
        <title>Contact Us - PassionFantasia</title>
        <meta name="description" content="Get in touch with the PassionFantasia team. We're here to help." />
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
                  <p className="text-sm text-muted-foreground">passionfantasia@gmail.com</p>
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
                  <p className="text-sm text-muted-foreground">Greater Noida, India</p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2 p-8 rounded-xl bg-card border border-border">
                <h2 className="font-display text-xl font-bold mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="text-sm font-medium mb-2 block">Name</label>
                      <Input
                        id="contact-name"
                        placeholder="Your name"
                        {...register("name")}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="text-sm font-medium mb-2 block">Email</label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="your@email.com"
                        {...register("email")}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="text-sm font-medium mb-2 block">Subject</label>
                    <Input
                      id="contact-subject"
                      placeholder="How can we help?"
                      {...register("subject")}
                      className={errors.subject ? "border-destructive" : ""}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea
                      id="contact-message"
                      placeholder="Tell us more..."
                      rows={6}
                      {...register("message")}
                      className={errors.message ? "border-destructive" : ""}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
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
