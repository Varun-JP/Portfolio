import { useRef, useState } from "react";
import { Mail, Phone, Send } from "lucide-react";
import emailjs from "@emailjs/browser";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import { ChromaHeading, SectionReveal } from "./SectionReveal";

export const ContactSection = () => {
  const formRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [hoverText, setHoverText] = useState(""); // tooltip text
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await emailjs.sendForm(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        formRef.current,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      toast({
        title: "Message Sent",
        description: "Thank you for your message. I will get back to you as soon as possible.",
      });
      formRef.current?.reset();
    } catch {
      toast({
        title: "Message Failed",
        description: "Something went wrong. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("varunjayprakash25@gmail.com");
    toast({ title: "Copied!", description: "Email address copied to clipboard." });
  };

  return (
    <section
      id="contact"
      className="py-24 px-4 relative overflow-hidden bg-gradient-to-b from-background via-secondary/10 to-background dark:bg-black"
      style={{ scrollMarginTop: "-50px" }}
    >
      <div className="container mx-auto max-w-3xl relative z-10">
        {/* Card — zoom reveal on scroll */}
        <SectionReveal
          fromVars={{ opacity: 0, scale: 0.88, y: 50 }}
          toVars={{ opacity: 1, scale: 1, y: 0 }}
          duration={1.1}
          ease="power3.out"
          start="top 82%"
          className="glass-card p-10 rounded-2xl border backdrop-blur-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl -z-10" />

          {/* Header with icons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            {/* Chromatic aberration zoom on the heading */}
            <ChromaHeading
              tag="h3"
              className="text-2xl font-semibold text-foreground flex items-center gap-2"
              start="top 82%"
            >
              <Send className="w-6 h-6 text-primary" /> Send a Message
            </ChromaHeading>

            <div className="flex items-center gap-3 relative">
              {/* Mail Icon */}
              <button
                onClick={handleCopyEmail}
                onMouseEnter={() => setHoverText("Copy Email")}
                onMouseLeave={() => setHoverText("")}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Mail size={20} />
                <span
                  className={cn(
                    "absolute -top-8 whitespace-nowrap px-2 py-1 rounded bg-foreground text-background text-xs shadow-lg transition-opacity duration-200",
                    hoverText === "Copy Email" ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  Copy Email
                </span>
              </button>

              {/* Phone Icon */}
              <a
                href="tel:+918097644905"
                onMouseEnter={() => setHoverText("Call Phone")}
                onMouseLeave={() => setHoverText("")}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Phone size={20} />
                <span
                  className={cn(
                    "absolute -top-8 whitespace-nowrap px-2 py-1 rounded bg-foreground text-background text-xs shadow-lg transition-opacity duration-200",
                    hoverText === "Call Phone" ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  Call Phone
                </span>
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
            {[
              {
                id: "from_name",
                type: "text",
                label: "Your Name",
                placeholder: "John Doe",
              },
              {
                id: "from_email",
                type: "email",
                label: "Your Email",
                placeholder: "john@example.com",
              },
            ].map((field, idx) => (
              <div key={idx} className="group">
                <label
                  htmlFor={field.id}
                  className={cn(
                    "block text-sm font-medium mb-2",
                    focusedField === field.id ? "text-primary" : "text-foreground"
                  )}
                >
                  {field.label}
                </label>
                <input
                  type={field.type}
                  id={field.id}
                  name={field.id}
                  required
                  placeholder={field.placeholder}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => setFocusedField(null)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border border-border text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                  )}
                />
              </div>
            ))}

            <div className="group">
              <label
                htmlFor="message"
                className={cn(
                  "block text-sm font-medium mb-2",
                  focusedField === "message" ? "text-primary" : "text-foreground"
                )}
              >
                Your Message
              </label>
              <textarea
                id="message"
                name="message"
                rows="5"
                placeholder="Tell me about your project or just say hi!"
                onFocus={() => setFocusedField("message")}
                onBlur={() => setFocusedField(null)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border text-foreground bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                )}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="cosmic-button w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...
                </>
              ) : (
                <>
                  Send Message <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </SectionReveal>
      </div>

      <style>{`
        :root:not(.dark) .glass-card {
          background: rgba(255,255,255,0.85);
          border: 1px solid hsl(var(--border));
        }
        .dark .glass-card {
          background: rgba(0,0,0,0.2);
          border: 1px solid hsl(var(--border));
        }
      `}</style>
    </section>
  );
};