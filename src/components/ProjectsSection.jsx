import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PROJECTS = [
  {
    title: "NEXUS",
    category: "Full Stack",
    description: "Role-based web platform with secure auth, dashboard analytics, and real-time updates.",
    tech: ["React", "Node.js", "MongoDB"],
    github: "https://github.com",
    live: "https://example.com",
  },
  {
    title: "CIPHER",
    category: "Backend",
    description: "Security-focused API service with token management, permission checks, and audit trails.",
    tech: ["Python", "FastAPI", "JWT"],
    github: "https://github.com",
    live: null,
  },
  {
    title: "AURORA",
    category: "Frontend",
    description: "Performance dashboard with interactive charts and clean data drill-down views.",
    tech: ["TypeScript", "D3.js", "REST API"],
    github: "https://github.com",
    live: "https://example.com",
  },
  {
    title: "PULSE",
    category: "Data",
    description: "Event analytics pipeline that tracks usage metrics and exposes actionable insights.",
    tech: ["JavaScript", "Express", "PostgreSQL"],
    github: "https://github.com",
    live: null,
  },
  {
    title: "VERTEX",
    category: "Graphics",
    description: "Interactive 3D viewer optimized for smooth rendering and intuitive scene controls.",
    tech: ["Three.js", "WebGL", "GLSL"],
    github: "https://github.com",
    live: "https://example.com",
  },
  {
    title: "PHANTOM",
    category: "Dev Tools",
    description: "Automation CLI for local workflows with config profiles and command chaining.",
    tech: ["Python", "Bash", "Linux"],
    github: "https://github.com",
    live: null,
  },
];

// A wide spread of fonts to cycle through on hover — no symbols, just typeface variety.
// Mix of sans, serif, mono, and display styles so the cycle feels like a type specimen flipping pages.
const FONT_CYCLE = [
  { family: "'Space Grotesk', sans-serif", weight: 700 },
  { family: "'Courier New', 'Courier', monospace", weight: 400 },
  { family: "'Georgia', 'Times New Roman', serif", weight: 600 },
  { family: "'Helvetica Neue', Arial, sans-serif", weight: 800 },
  { family: "'Garamond', 'Baskerville', serif", weight: 400 },
  { family: "'Verdana', 'Tahoma', sans-serif", weight: 700 },
  { family: "'Palatino', 'Book Antiqua', serif", weight: 500 },
  { family: "'Trebuchet MS', sans-serif", weight: 600 },
  { family: "'Consolas', 'Monaco', monospace", weight: 500 },
  { family: "'Didot', 'Bodoni MT', serif", weight: 400 },
];

// Each project still has a "home" font (used at rest / when active) so the section keeps its identity.
const PROJECT_FONTS = [
  "'Space Grotesk', sans-serif",
  "'Courier New', 'Courier', monospace",
  "'Georgia', 'Times New Roman', serif",
  "'Space Grotesk', sans-serif",
  "'Courier New', monospace",
  "'Georgia', serif",
];

const PROJECT_WEIGHTS = [700, 400, 600, 800, 300, 500];

// Timing — tuned to feel intentional, not flickery.
const TICK_MS = 140; // how long each font holds before swapping to the next
const STAGGER_IN_MS = 45; // delay between each letter starting its cycle
const STAGGER_OUT_MS = 55; // delay between each letter resolving back on mouseleave
const MIN_CYCLES = 4; // each letter cycles through at least this many fonts...
const MAX_CYCLES = 6; // ...and at most this many, then holds on a settled font

function randomFont() {
  return FONT_CYCLE[Math.floor(Math.random() * FONT_CYCLE.length)];
}

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function ScrambleTitle({ title, isActive, projectIndex, onHoverChange }) {
  const letterEls = useRef([]);
  const timeoutsRef = useRef([]);
  const isHovering = useRef(false);
  const homeFont = PROJECT_FONTS[projectIndex % PROJECT_FONTS.length];
  const homeWeight = PROJECT_WEIGHTS[projectIndex % PROJECT_WEIGHTS.length];

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const setLetterFont = (el, family, weight) => {
    if (!el) return;
    el.style.fontFamily = family;
    el.style.fontWeight = weight;
  };

  const startScramble = useCallback(() => {
    if (isHovering.current) return;
    isHovering.current = true;
    onHoverChange(true);

    letterEls.current.forEach((el, i) => {
      if (!el) return;
      //const cycles = MIN_CYCLES + Math.floor(Math.random() * (MAX_CYCLES - MIN_CYCLES + 1));

      const startDelay = i * STAGGER_IN_MS;
      const startTimeout = setTimeout(() => {
        //let tick = 0;
        const runTick = () => {
          if (!isHovering.current) return;
          // if (tick >= cycles) {
          //   // Settle on a final (slightly randomized) font and stop — no infinite flicker.
          //   const settled = randomFont();
          //   setLetterFont(el, settled.family, settled.weight);
          //   return;
          // }
          const next = randomFont();
          setLetterFont(el, next.family, next.weight);
          //tick++;
          const t = setTimeout(runTick, TICK_MS);
          timeoutsRef.current.push(t);
        };
        runTick();
      }, startDelay);

      timeoutsRef.current.push(startTimeout);
    });
  }, [onHoverChange]);

  const stopScramble = useCallback(() => {
    if (!isHovering.current) return;
    isHovering.current = false;
    onHoverChange(false);

    clearTimers();

    // Resolve every letter back to the project's home font, staggered left to right.
    letterEls.current.forEach((el, i) => {
      const t = setTimeout(() => {
        setLetterFont(el, homeFont, homeWeight);
      }, i * STAGGER_OUT_MS);
      timeoutsRef.current.push(t);
    });
  }, [homeFont, homeWeight]);

  // Snap back to home font if row becomes active (clicked) while mid-cycle.
  useEffect(() => {
    if (isActive) stopScramble();
  }, [isActive, stopScramble]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <h2
      onMouseEnter={startScramble}
      onMouseLeave={stopScramble}
      style={{
        margin: 0,
        fontFamily: homeFont,
        fontSize: "clamp(1.6rem, 3.2vw, 2.8rem)",
        fontWeight: homeWeight,
        lineHeight: 1,
        letterSpacing: isActive ? "0.15em" : "0.02em",
        transition: "letter-spacing 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.3s",
        userSelect: "none",
        display: "flex",
        gap: "0.01em",
      }}
    >
      {title.split("").map((char, ci) => (
        <span
          key={ci}
          ref={(el) => (letterEls.current[ci] = el)}
          style={{
            display: "inline-block",
            color: ci === 2 ? "#FFAA00" : "inherit",
            textShadow:
              ci === 2 && isActive ? "0 0 30px rgba(255,170,0,0.5)" : "none",
            transition: "text-shadow 0.4s, color 0.3s",
            minWidth: "0.5em",
          }}
        >
          {char}
        </span>
      ))}
    </h2>
  );
}

export const ProjectsSection = () => {
  const isDark = useIsDark();
  const [activeIndex, setActiveIndex] = useState(null);
  const sectionRef = useRef(null);
  const rowRefs = useRef([]);
  const contentRefs = useRef([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Entrance animation
  useEffect(() => {
    const rows = rowRefs.current.filter(Boolean);
    if (!rows.length) return;

    gsap.set(rows, { y: 48, opacity: 0 });

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 72%",
      once: true,
      onEnter: () => {
        gsap.to(rows, {
          y: 0,
          opacity: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.08,
        });
      },
    });

    return () => st.kill();
  }, []);

  // Ghost / unghost rows on active change, with hover also dimming siblings
  // when nothing is actively selected (click takes priority over hover).
  useEffect(() => {
    const rows = rowRefs.current.filter(Boolean);
    const contents = contentRefs.current.filter(Boolean);
    if (!rows.length) return;

    rows.forEach((row, i) => {
      const isThisActive = i === activeIndex;
      const isThisHovered = i === hoveredIndex;
      const content = contents[i];

      let targetOpacity = 1;
      if (activeIndex !== null) {
        targetOpacity = isThisActive ? 1 : 0.12;
      } else if (hoveredIndex !== null) {
        targetOpacity = isThisHovered ? 1 : 0.3;
      }

      gsap.to(row, {
        opacity: targetOpacity,
        duration: 0.45,
        ease: "power2.out",
      });

      if (content) {
        if (isThisActive) {
          gsap.to(content, {
            height: "auto",
            opacity: 1,
            duration: 0.55,
            ease: "power3.out",
          });
        } else {
          gsap.to(content, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          });
        }
      }
    });

    // Chromatic glitch on newly active title
    if (activeIndex !== null) {
      const activeRow = rows[activeIndex];
      const title = activeRow?.querySelector("h2");
      if (title) {
        let count = 0;
        const glitch = () => {
          if (count >= 5) { title.style.textShadow = "none"; return; }
          const i = (5 - count) * 2.8;
          title.style.textShadow = `${i}px 0 0 rgba(255,0,0,0.5), ${-i}px 0 0 rgba(0,255,255,0.45)`;
          count++;
          setTimeout(glitch, 55 + count * 12);
        };
        setTimeout(glitch, 60);
      }
    }
  }, [activeIndex, hoveredIndex]);

  const handleClick = (i) => {
    setActiveIndex((prev) => (prev === i ? null : i));
  };

  const c = {
    text: isDark ? "#fff" : "#000",
    muted: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    desc: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
    tagBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
    tag: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
    link: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)",
    bg: isDark ? "#000" : "#f9fafb",
  };

  return (
    <section
      id="projects"
      ref={sectionRef}
      style={{
        width: "100%",
        padding: "clamp(4rem, 10vh, 7rem) clamp(1.5rem, 6vw, 5rem)",
        boxSizing: "border-box",
        background: c.bg,
        transition: "background 0.3s",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "clamp(2rem, 5vh, 3.5rem)",
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: c.muted,
        }}>
          Selected Work
        </span>
        <span style={{ flex: 1, height: "1px", background: c.border }} />
        <span style={{
          fontFamily: "'Space Grotesk', monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          color: c.muted,
        }}>
          {PROJECTS.length.toString().padStart(2, "0")}
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {PROJECTS.map((project, i) => (
          <div
            key={project.title}
            ref={(el) => (rowRefs.current[i] = el)}
            style={{ opacity: 0 }}
          >
            <button
              onClick={() => handleClick(i)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "clamp(0.9rem, 2vh, 1.4rem) 0",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "1.5rem",
                borderTop: `1px solid ${c.border}`,
                textAlign: "left",
                color: c.text,
              }}
            >
              <ScrambleTitle
                title={project.title}
                isActive={activeIndex === i}
                projectIndex={i}
                onHoverChange={(h) => setHoveredIndex(h ? i : null)}
              />

              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "0.2rem",
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: activeIndex === i ? "#FFAA00" : c.muted,
                  transition: "color 0.4s",
                }}>
                  {project.category}
                </span>
                <span style={{
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                  color: c.muted,
                  opacity: 0.5,
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            </button>

            {/* Expandable content */}
            <div
              ref={(el) => (contentRefs.current[i] = el)}
              style={{ height: 0, opacity: 0, overflow: "hidden" }}
            >
              <div style={{
                padding: "0.75rem 0 clamp(1.25rem, 3vw, 2rem)",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
                gap: "clamp(1rem, 4vw, 3rem)",
                alignItems: "start",
              }}>
                <p style={{
                  margin: 0,
                  fontFamily: PROJECT_FONTS[i % PROJECT_FONTS.length],
                  fontSize: "clamp(0.85rem, 1.1vw, 1rem)",
                  lineHeight: 1.75,
                  color: c.desc,
                  fontWeight: 400,
                }}>
                  {project.description}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {project.tech.map((t) => (
                      <span key={t} style={{
                        padding: "0.28rem 0.65rem",
                        borderRadius: "999px",
                        border: `1px solid ${c.tagBorder}`,
                        fontSize: "0.7rem",
                        letterSpacing: "0.07em",
                        fontFamily: "'Space Grotesk', monospace",
                        color: c.tag,
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "1.25rem" }}>
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "'Space Grotesk', monospace",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#FFAA00",
                          textDecoration: "none",
                          borderBottom: "1px solid rgba(255,170,0,0.35)",
                          paddingBottom: "2px",
                        }}
                      >
                        GitHub ↗
                      </a>
                    )}
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "'Space Grotesk', monospace",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: c.link,
                          textDecoration: "none",
                          borderBottom: `1px solid ${c.tagBorder}`,
                          paddingBottom: "2px",
                        }}
                      >
                        Live ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${c.border}` }} />
      </div>
    </section>
  );
};