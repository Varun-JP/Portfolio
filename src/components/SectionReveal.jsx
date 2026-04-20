import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────
// ChromaHeading
// Heading element that reveals with a zoom +
// chromatic-aberration (red/cyan text-shadow)
// identical to the landing page DNA.
// ─────────────────────────────────────────────
export const ChromaHeading = ({
  children,
  className = "",
  tag: Tag = "h2",
  start = "top 85%",
  delay = 0,
}) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          opacity: 0,
          scale: 0.88,
          textShadow:
            "10px 0 0 rgba(255,0,0,0.55), -10px 0 0 rgba(0,255,255,0.55)",
        },
        {
          opacity: 1,
          scale: 1,
          textShadow:
            "0px 0 0 rgba(255,0,0,0), 0px 0 0 rgba(0,255,255,0)",
          duration: 1.2,
          ease: "power3.out",
          delay,
          scrollTrigger: {
            trigger: el,
            start,
            once: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
};

// ─────────────────────────────────────────────
// SectionReveal
// Generic wrapper that applies a scroll-
// triggered zoom + fade to itself, or (when
// stagger > 0) to each of its direct children.
// ─────────────────────────────────────────────
export const SectionReveal = ({
  children,
  className = "",
  style = {},
  fromVars = { opacity: 0, scale: 0.88, y: 50 },
  toVars   = { opacity: 1, scale: 1,    y: 0  },
  duration = 1,
  ease     = "power3.out",
  delay    = 0,
  stagger  = 0,
  start    = "top 85%",
  tag: Tag = "div",
}) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger > 0 ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        fromVars,
        {
          ...toVars,
          duration,
          ease,
          delay,
          stagger,
          scrollTrigger: {
            trigger: el,
            start,
            once: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
};
