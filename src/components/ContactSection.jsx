import { useRef, useState, useEffect, useCallback } from "react";
import { Mail, Send } from "lucide-react";
import emailjs from "@emailjs/browser";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import { ChromaHeading, SectionReveal } from "./SectionReveal";
import gsap from "gsap";

const BRAND = "#FFAA00";

export const ContactSection = () => {
  const formRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [hoverText, setHoverText] = useState(""); // tooltip text
  const { toast } = useToast();

  const sectionRef = useRef(null);
  const orbitRef = useRef(null);
  const iconRefs = useRef({});
  const emailRowRef = useRef(null);
  const headingRef = useRef(null);

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

  // ─── Orbit ring — continuous rotation around the "O" ─────────────────────
  useEffect(() => {
    if (!orbitRef.current) return;
    const tween = gsap.to(orbitRef.current, {
      rotate: 360,
      duration: 5,
      repeat: -1,
      ease: "none",
      transformOrigin: "50% 50%",
    });
    return () => tween.kill();
  }, []);

  // ─── Heading: per-letter stagger reveal on mount ─────────────────────────
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const letters = el.querySelectorAll(".contact-letter");
    gsap.fromTo(
      letters,
      { y: "110%", opacity: 0, rotate: 6 },
      {
        y: "0%",
        opacity: 1,
        rotate: 0,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.045,
        delay: 0.1,
      }
    );
  }, []);

  // ─── Chromatic glitch flash — same red/cyan split language as Skills.jsx ──
  const glitchFlash = useCallback((el, punches = 4) => {
    if (!el) return;
    let c = 0;
    const pulse = () => {
      if (c >= punches) { el.style.filter = "none"; return; }
      const a = (punches - c) * 2.4;
      el.style.filter = `drop-shadow(${a}px 0 0 rgba(255,40,40,0.55)) drop-shadow(${-a}px 0 0 rgba(0,225,255,0.5))`;
      c++;
      setTimeout(pulse, 38);
    };
    pulse();
  }, []);

  // ─── Magnetic tilt on the email row ──────────────────────────────────────
  const handleEmailMove = useCallback((e) => {
    const el = emailRowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      x: px * 10,
      y: py * 8,
      rotate: px * 2,
      duration: 0.4,
      ease: "power2.out",
    });
  }, []);

  const handleEmailLeave = useCallback(() => {
    setHoverText("");
    gsap.to(emailRowRef.current, {
      x: 0,
      y: 0,
      rotate: 0,
      duration: 0.6,
      ease: "elastic.out(1, 0.5)",
    });
  }, []);

  const fields = [
    { id: "from_name", type: "text", label: "Full Name", placeholder: "John Doe" },
    { id: "from_email", type: "email", label: "Email Address", placeholder: "john@example.com" },
    { id: "subject", type: "text", label: "Subject", placeholder: "Let's build something" },
  ];

  const HEADING_TEXT = "CONTACT";

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="contact-section"
      style={{ scrollMarginTop: "-50px" }}
    >
      <div className="contact-inner">
        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="contact-left">
          <SectionReveal
            fromVars={{ opacity: 0, y: 16 }}
            toVars={{ opacity: 1, y: 0 }}
            duration={0.7}
            start="top 85%"
          >
            <div className="contact-eyebrow-row">
              <span className="contact-eyebrow-dot" />
              <span className="contact-eyebrow">Get In Touch</span>
            </div>
          </SectionReveal>

          <div className="contact-heading-wrap" ref={headingRef}>
            <ChromaHeading tag="h2" className="contact-heading contact-heading-oneline" start="top 85%">
              {HEADING_TEXT.split("").map((ch, i) => (
                <span className="contact-letter-mask" key={i}>
                  <span
                    className={cn(
                      "contact-letter",
                      ch === "O" && "contact-o-letter"
                    )}
                  >
                    {ch === "O" ? (
                      <span className="contact-o-wrap">
                        <span className="contact-o">O</span>
                        <span className="contact-orbit" ref={orbitRef}>
                          <span className="contact-orbit-dot" />
                        </span>
                      </span>
                    ) : (
                      ch
                    )}
                  </span>
                </span>
              ))}
            </ChromaHeading>
          </div>

          <SectionReveal
            fromVars={{ opacity: 0, y: 14 }}
            toVars={{ opacity: 1, y: 0 }}
            duration={0.7}
            delay={0.15}
            start="top 85%"
          >
            <p className="contact-desc">
              Interested in working together or just want to say hi? I'm always open to
              discussing new projects, creative ideas, or being part of your visions.
            </p>
          </SectionReveal>

          <SectionReveal
            fromVars={{ opacity: 0, y: 14 }}
            toVars={{ opacity: 1, y: 0 }}
            duration={0.7}
            delay={0.25}
            start="top 85%"
          >
            <div className="contact-info-list">
              <button
                type="button"
                className="contact-info-row"
                ref={emailRowRef}
                onClick={handleCopyEmail}
                onMouseEnter={() => {
                  setHoverText("Copy Email");
                  glitchFlash(iconRefs.current.mail, 5);
                }}
                onMouseMove={handleEmailMove}
                onMouseLeave={handleEmailLeave}
              >
                <span className="contact-info-icon" ref={(el) => (iconRefs.current.mail = el)}>
                  <Mail size={18} />
                </span>
                <span className="contact-info-text">
                  <span className="contact-info-label">
                    {hoverText === "Copy Email" ? "Click to copy" : "Email Me"}
                  </span>
                  <span className="contact-info-value">hello@varun.dev</span>
                </span>
              </button>
            </div>
          </SectionReveal>
        </div>

        {/* ── Right column: form ───────────────────────────────────────── */}
        <SectionReveal
          fromVars={{ opacity: 0, x: 40 }}
          toVars={{ opacity: 1, x: 0 }}
          duration={0.9}
          ease="power3.out"
          start="top 82%"
          className="contact-right"
        >
          <form ref={formRef} className="contact-form" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <div key={field.id} className="contact-field">
                <label
                  htmlFor={field.id}
                  className={cn("contact-label", focusedField === field.id && "is-active")}
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
                  className="contact-input"
                />
                <span className={cn("contact-underline", focusedField === field.id && "is-active")} />
              </div>
            ))}

            <div className="contact-field">
              <label
                htmlFor="message"
                className={cn("contact-label", focusedField === "message" && "is-active")}
              >
                Project Details
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                required
                placeholder="Tell me about your project or just say hi!"
                onFocus={() => setFocusedField("message")}
                onBlur={() => setFocusedField(null)}
                className="contact-input contact-textarea"
              />
              <span className={cn("contact-underline", focusedField === "message" && "is-active")} />
            </div>

            <button type="submit" disabled={isSubmitting} className="contact-submit">
              {isSubmitting ? (
                <>
                  <span className="contact-spinner" /> Sending...
                </>
              ) : (
                <>
                  Send Message <Send size={15} />
                </>
              )}
            </button>
          </form>
        </SectionReveal>
      </div>

      <style>{`
        .contact-section {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          padding: clamp(2rem, 6vh, 4rem) clamp(1rem, 4vw, 3rem);
          background: hsl(var(--background));
        }

        .contact-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(2rem, 6vw, 5rem);
          align-items: center;
        }

        /* ── Left column ── */
        .contact-left {
          display: flex;
          flex-direction: column;
          gap: 1.6rem;
        }

        .contact-eyebrow-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .contact-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${BRAND};
          animation: contact-dot-pulse 2.2s ease-out infinite;
          flex-shrink: 0;
        }

        @keyframes contact-dot-pulse {
          0%   { box-shadow: 0 0 0 0 ${BRAND}66; }
          70%  { box-shadow: 0 0 0 8px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }

        .contact-eyebrow {
          font-family: var(--font-space-grotesk);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: hsl(var(--foreground) / 0.55);
        }

        .contact-heading-wrap {
          line-height: 0.92;
        }

        .contact-heading-oneline {
          display: flex !important;
          flex-wrap: nowrap;
        }

        .contact-heading {
          font-family: Georgia, "Playfair Display", "Times New Roman", serif !important;
          font-size: clamp(2.6rem, 6.4vw, 5.6rem) !important;
          font-weight: 500;
          color: hsl(var(--foreground));
          margin: 0 !important;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .contact-letter-mask {
          display: inline-block;
          overflow: hidden;
          vertical-align: top;
        }

        .contact-letter {
          display: inline-block;
          will-change: transform, opacity;
        }

        .contact-o-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .contact-o {
          color: ${BRAND};
          position: relative;
          z-index: 1;
          display: inline-block;
          animation: contact-o-breathe 3.4s ease-in-out infinite;
        }

        @keyframes contact-o-breathe {
          0%, 100% { text-shadow: 0 0 0px ${BRAND}00; }
          50%      { text-shadow: 0 0 18px ${BRAND}55; }
        }

        .contact-orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 122%;
          height: 122%;
          transform: translate(-50%, -50%);
          border: 1px solid ${BRAND}55;
          border-radius: 50%;
          pointer-events: none;
        }

        .contact-orbit-dot {
          position: absolute;
          top: -3px;
          left: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${BRAND};
          box-shadow: 0 0 8px 2px ${BRAND}aa;
          transform: translateX(-50%);
        }

        .contact-desc {
          max-width: 34ch;
          color: hsl(var(--foreground) / 0.5);
          font-size: clamp(0.85rem, 1.1vw, 0.98rem);
          line-height: 1.6;
          margin: 0.4rem 0 0 0;
        }

        .contact-info-list {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          margin-top: 0.4rem;
        }

        .contact-info-row {
          display: inline-flex;
          align-items: center;
          gap: 0.85rem;
          background: none;
          border: none;
          padding: 0.4rem 0.6rem 0.4rem 0;
          cursor: pointer;
          text-align: left;
          font: inherit;
          color: inherit;
          width: fit-content;
          will-change: transform;
        }

        .contact-info-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid hsl(var(--foreground) / 0.18);
          color: hsl(var(--foreground) / 0.85);
          flex-shrink: 0;
          transition: border-color 0.3s ease, color 0.3s ease, transform 0.3s ease;
        }

        .contact-info-row:hover .contact-info-icon {
          border-color: ${BRAND}aa;
          color: ${BRAND};
          transform: scale(1.08) rotate(-6deg);
        }

        .contact-info-text {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .contact-info-label {
          font-family: var(--font-space-grotesk);
          font-size: 0.65rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: hsl(var(--foreground) / 0.4);
          transition: color 0.3s ease;
        }

        .contact-info-row:hover .contact-info-label {
          color: ${BRAND};
        }

        .contact-info-value {
          font-size: 0.92rem;
          font-weight: 600;
          color: hsl(var(--foreground) / 0.9);
        }

        /* ── Right column: form ── */
        .contact-right {
          display: flex;
          flex-direction: column;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 2.1rem;
        }

        .contact-field {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .contact-label {
          font-family: var(--font-space-grotesk);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: hsl(var(--foreground) / 0.4);
          transition: color 0.25s ease, transform 0.25s ease;
        }

        .contact-label.is-active {
          color: ${BRAND};
          animation: contact-label-flicker 0.4s steps(3) 1;
        }

        @keyframes contact-label-flicker {
          0%   { opacity: 0.2; transform: translateX(-2px); }
          40%  { opacity: 1;   transform: translateX(1px); }
          60%  { opacity: 0.5; transform: translateX(-1px); }
          100% { opacity: 1;   transform: translateX(0); }
        }

        .contact-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: hsl(var(--foreground));
          font-size: 0.95rem;
          padding: 0.3rem 0 0.7rem 0;
          font-family: var(--font-space-grotesk);
          transition: transform 0.25s ease;
        }

        .contact-field:focus-within .contact-input {
          transform: translateX(2px);
        }

        .contact-input::placeholder {
          color: hsl(var(--foreground) / 0.25);
        }

        .contact-textarea {
          resize: none;
          min-height: 70px;
        }

        .contact-underline {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: hsl(var(--foreground) / 0.14);
          overflow: hidden;
        }

        .contact-underline::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, ${BRAND}, #ff5f5f 50%, ${BRAND});
          background-size: 200% 100%;
          transform: translateX(-100%);
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .contact-underline.is-active::after {
          transform: translateX(0%);
          animation: contact-underline-shimmer 1.6s linear infinite;
        }

        @keyframes contact-underline-shimmer {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        .contact-submit {
          margin-top: 0.6rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          background: hsl(var(--foreground));
          color: hsl(var(--background));
          border: none;
          border-radius: 8px;
          padding: 1rem 1.6rem;
          font-family: var(--font-space-grotesk);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .contact-submit:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .contact-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px -12px ${BRAND}88;
        }

        .contact-submit:hover:not(:disabled)::before {
          content: "";
          position: absolute;
          inset: 0;
          animation: contact-glitch-sweep 0.5s steps(6) 1;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 40, 40, 0.18) 30%,
            transparent 45%,
            rgba(0, 225, 255, 0.18) 65%,
            transparent 100%
          );
          pointer-events: none;
        }

        @keyframes contact-glitch-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .contact-submit:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .contact-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid hsl(var(--background) / 0.3);
          border-top-color: hsl(var(--background));
          border-radius: 50%;
          animation: contact-spin 0.7s linear infinite;
        }

        @keyframes contact-spin {
          to { transform: rotate(360deg); }
        }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .contact-inner {
            grid-template-columns: 1fr;
          }
          .contact-heading {
            font-size: clamp(2.2rem, 11vw, 3.6rem) !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .contact-eyebrow-dot, .contact-submit::before, .contact-spinner,
          .contact-o, .contact-underline.is-active::after {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};