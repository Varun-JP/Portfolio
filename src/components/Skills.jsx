import { useRef, useEffect, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { ChromaHeading, SectionReveal } from "./SectionReveal";
import { useScrollZoom } from "../hooks/useScrollZoom";
import {
  FaHtml5, FaCss3Alt, FaJs, FaReact, FaNodeJs,
  FaGitAlt, FaGithub, FaPython, FaJava, FaDocker,
} from "react-icons/fa";
import {
  SiMongodb, SiTailwindcss, SiCplusplus, SiR, SiDjango,
  SiMysql, SiPostgresql, SiPytorch, SiTensorflow,
  SiOpencv, SiNumpy, SiPandas,
} from "react-icons/si";
import gsap from "gsap";

const CATEGORIES = [
  {
    label: "Programming",
    accent: "#3b82f6",
    indent: 0,
    skills: [
      { name: "Python",     icon: <FaPython />,   color: "#3776ab" },
      { name: "JavaScript", icon: <FaJs />,        color: "#facc15" },
      { name: "Java",       icon: <FaJava />,       color: "#f89820" },
      { name: "C++",        icon: <SiCplusplus />,  color: "#60a5fa" },
      { name: "R",          icon: <SiR />,          color: "#276dc3" },
    ],
  },
  {
    label: "Web & Frontend",
    accent: "#22d3ee",
    indent: 1,
    skills: [
      { name: "HTML5",    icon: <FaHtml5 />,      color: "#f97316" },
      { name: "CSS3",     icon: <FaCss3Alt />,     color: "#3b82f6" },
      { name: "React",    icon: <FaReact />,       color: "#22d3ee" },
      { name: "Tailwind", icon: <SiTailwindcss />, color: "#38bdf8" },
      { name: "Node.js",  icon: <FaNodeJs />,      color: "#22c55e" },
      { name: "Django",   icon: <SiDjango />,      color: "#16a34a" },
    ],
  },
  {
    label: "Databases",
    accent: "#818cf8",
    indent: 2,
    skills: [
      { name: "MySQL",      icon: <SiMysql />,      color: "#00758f" },
      { name: "PostgreSQL", icon: <SiPostgresql />, color: "#818cf8" },
      { name: "MongoDB",    icon: <SiMongodb />,    color: "#16a34a" },
    ],
  },
  {
    label: "AI & ML",
    accent: "#f97316",
    indent: 3,
    skills: [
      { name: "PyTorch",    icon: <SiPytorch />,    color: "#ee4c2c" },
      { name: "TensorFlow", icon: <SiTensorflow />, color: "#ff6f00" },
      { name: "OpenCV",     icon: <SiOpencv />,     color: "#a78bfa" },
      { name: "NumPy",      icon: <SiNumpy />,      color: "#4dabcf" },
      { name: "Pandas",     icon: <SiPandas />,     color: "#e879f9" },
    ],
  },
  {
    label: "Tools & DevOps",
    accent: "#ea580c",
    indent: 4,
    skills: [
      { name: "Git",    icon: <FaGitAlt />, color: "#ea580c" },
      { name: "GitHub", icon: <FaGithub />, color: "#a0aec0" },
      { name: "Docker", icon: <FaDocker />, color: "#2496ed" },
    ],
  },
];

const TILE_SIZE = 76;
const TILE_GAP = 16;
const BRAND = "#FFAA00"; // ties back to the landing page's amber

export const Skills = () => {
  const { isDark } = useTheme();
  const sectionRef = useRef(null);
  const fieldRef = useRef(null);
  const tilesRef = useRef([]); // [{ el, iconEl, catIndex, skill, restX, restY }]
  const burstPlayedRef = useRef(false);
  const activeCatRef = useRef(null);

  useScrollZoom(sectionRef, {
    fromVars: { opacity: 0, y: 40 },
    toVars:   { opacity: 1, y: 0 },
    duration: 1.1,
    ease: "power3.out",
    start: "top 80%",
  });

  // ─── Chromatic glitch flash — same red/cyan split language as Landing/Projects ──
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

  // ─── Layout: clean, structured grid (no scatter — order is the design) ──
  const computeRestPositions = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    const W = field.offsetWidth;
    const cols = Math.max(1, Math.floor(W / (TILE_SIZE + TILE_GAP)));
    let col = 0, row = 0;
    tilesRef.current.forEach((t) => {
      const x = col * (TILE_SIZE + TILE_GAP);
      const y = row * (TILE_SIZE + TILE_GAP);
      t.restX = Math.max(0, Math.min(x, W - TILE_SIZE));
      t.restY = y;
      col++;
      if (col >= cols) { col = 0; row++; }
    });
  }, []);

  // ─── Cinematic entrance: rows slam in with weight, then glitch-settle ───
  const playBurst = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;

    const rows = {};
    tilesRef.current.forEach((t) => {
      const rowKey = Math.round(t.restY);
      if (!rows[rowKey]) rows[rowKey] = [];
      rows[rowKey].push(t);
    });
    const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);

    const master = gsap.timeline();

    rowKeys.forEach((rowKey, rowIdx) => {
      const rowTiles = rows[rowKey].sort((a, b) => a.restX - b.restX);
      rowTiles.forEach((t) => {
        gsap.set(t.el, {
          x: t.restX,
          y: t.restY + 70,
          opacity: 0,
          scale: 1.3,
          filter: "blur(10px)",
        });
      });

      master.to(
        rowTiles.map((t) => t.el),
        {
          y: (i) => rowTiles[i].restY,
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power4.out",
          stagger: 0.04,
          onStart: () => {
            rowTiles.forEach((t, i) => {
              gsap.delayedCall(i * 0.04 + 0.3, () => {
                t.el.style.borderColor = `${t.skill.color}66`;
                t.el.style.background = `${t.skill.color}12`;
                glitchFlash(t.iconEl, 4);
              });
            });
          },
        },
        rowIdx * 0.085
      );
    });
  }, [glitchFlash]);

  // ─── Magnetic cluster target ─────────────────────────────────────────────
  const computeClusterTargets = useCallback((catIndex) => {
    const field = fieldRef.current;
    if (!field) return;
    const catTiles = tilesRef.current.filter(t => t.catIndex === catIndex);
    const n = catTiles.length;
    const totalW = n * (TILE_SIZE + TILE_GAP) - TILE_GAP;
    const fieldW = field.offsetWidth;
    const fieldH = tilesRef.current.reduce((max, t) => Math.max(max, t.restY + TILE_SIZE), 0);
    const startX = (fieldW - totalW) / 2;
    const cy = fieldH / 2 - TILE_SIZE / 2;
    catTiles.forEach((t, i) => {
      t.clusterX = startX + i * (TILE_SIZE + TILE_GAP);
      t.clusterY = cy;
    });
  }, []);

  // ─── Apply magnetic pull — violent snap, hard glow, chromatic punch ──────
  const applyMagneticPull = useCallback((catIndex) => {
    computeClusterTargets(catIndex);
    const catTiles   = tilesRef.current.filter(t => t.catIndex === catIndex);
    const otherTiles = tilesRef.current.filter(t => t.catIndex !== catIndex);

    catTiles.forEach((t, i) => {
      gsap.killTweensOf(t.el);
      const overshoot = (i % 2 === 0 ? 1 : -1) * 3;
      const tl = gsap.timeline({ delay: i * 0.014 });
      tl.to(t.el, {
        x: t.clusterX,
        y: t.clusterY - 10,
        scale: 1.3,
        rotate: overshoot,
        filter: "blur(0px)",
        duration: 0.32,
        ease: "power4.out",
      }).to(t.el, {
        y: t.clusterY,
        scale: 1.22,
        rotate: 0,
        duration: 0.22,
        ease: "back.out(2.4)",
      });

      gsap.to(t.el, {
        opacity: 1,
        duration: 0.22,
        ease: "power2.out",
        borderColor: `${t.skill.color}ee`,
        background: `${t.skill.color}26`,
        boxShadow: `0 18px 50px -10px ${t.skill.color}cc, 0 0 0 1px ${t.skill.color}55, 0 0 40px ${t.skill.color}40`,
      });

      glitchFlash(t.iconEl, 5);
    });

    // Non-matching tiles get shoved off-stage hard — decisive, not timid.
    otherTiles.forEach(t => {
      gsap.killTweensOf(t.el);
      const fieldCX = (fieldRef.current?.offsetWidth ?? 600) / 2;
      const dx = t.restX - fieldCX;
      gsap.to(t.el, {
        x: t.restX + dx * 0.22 + (dx >= 0 ? 18 : -18),
        y: t.restY,
        scale: 0.74,
        opacity: 0.08,
        filter: "blur(3px)",
        duration: 0.35,
        ease: "power3.out",
        boxShadow: "0 0 0px 0px transparent",
      });
    });
  }, [computeClusterTargets, glitchFlash]);

  // ─── Release magnets: one hard drop back into the grid, then settle ─────
  const releaseMagnets = useCallback(() => {
    tilesRef.current.forEach((t, i) => {
      gsap.killTweensOf(t.el);
      const tl = gsap.timeline({ delay: (i % 6) * 0.012 });
      tl.to(t.el, {
        x: t.restX,
        y: t.restY - 6,
        scale: 1.04,
        rotate: 0,
        filter: "blur(0px)",
        opacity: 1,
        duration: 0.32,
        ease: "power3.out",
        borderColor: `${t.skill.color}66`,
        background: `${t.skill.color}12`,
        boxShadow: "0 0 0px 0px transparent",
      }).to(t.el, {
        y: t.restY,
        scale: 1,
        duration: 0.22,
        ease: "back.out(2)",
      });
    });
  }, []);

  // ─── Mount: build DOM refs, set up IntersectionObserver ─────────────────
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    // Gather all tile elements by data-index
    const tileEls = Array.from(field.querySelectorAll("[data-tile-index]"));
    tileEls.forEach(el => {
      const i = parseInt(el.dataset.tileIndex);
      const iconEl = el.querySelector(".skill-icon-wrap");
      let catIndex = 0, skill = null;
      let count = 0;
      for (const cat of CATEGORIES) {
        for (const sk of cat.skills) {
          if (count === i) { skill = sk; break; }
          count++;
        }
        if (skill) break;
        catIndex++;
      }
      tilesRef.current[i] = { el, iconEl, catIndex, skill, restX: 0, restY: 0 };
    });

    computeRestPositions();
    // Set initial positions before burst
    tilesRef.current.forEach(t => {
      gsap.set(t.el, { x: t.restX, y: t.restY, opacity: 0 });
    });

    // Dynamic field height
    const maxBottom = tilesRef.current.reduce((max, t) => Math.max(max, t.restY + TILE_SIZE), 0);
    field.style.height = `${maxBottom + 20}px`;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !burstPlayedRef.current) {
          burstPlayedRef.current = true;
          playBurst();
        }
      });
    }, { threshold: 0.2 });
    obs.observe(field);

    const handleResize = () => {
      computeRestPositions();
      if (burstPlayedRef.current && activeCatRef.current === null) {
        tilesRef.current.forEach(t => gsap.set(t.el, { x: t.restX, y: t.restY }));
        const maxB = tilesRef.current.reduce((m, t) => Math.max(m, t.restY + TILE_SIZE), 0);
        field.style.height = `${maxB + 20}px`;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { obs.disconnect(); window.removeEventListener("resize", handleResize); };
  }, [computeRestPositions, playBurst]);

  const handleFilterEnter = useCallback((catIndex) => {
    activeCatRef.current = catIndex;
    applyMagneticPull(catIndex);
  }, [applyMagneticPull]);

  const handleFilterLeave = useCallback(() => {
    activeCatRef.current = null;
    releaseMagnets();
  }, [releaseMagnets]);

  // Build flat tile list with global indices
  let globalIndex = 0;
  const allSkillsFlat = [];
  CATEGORIES.forEach((cat, ci) => {
    cat.skills.forEach(skill => {
      allSkillsFlat.push({ skill, catIndex: ci, index: globalIndex++ });
    });
  });

  return (
    <section
      id="skills"
      ref={sectionRef}
      style={{ scrollMarginTop: "-20px" }}
      className="skills-section"
    >
      <div className="skills-inner">
        {/* Eyebrow header — same grammar as the Projects section: label / rule / count */}
        <div className="skills-eyebrow-row">
          <span className="skills-eyebrow">Capabilities</span>
          <span className="skills-eyebrow-rule" />
          <span className="skills-eyebrow-count">
            {CATEGORIES.reduce((n, c) => n + c.skills.length, 0).toString().padStart(2, "0")}
          </span>
        </div>

        {/* Heading */}
        <div className="skills-heading-wrap">
          <ChromaHeading className="skills-heading" start="top 85%">
            My{" "}
            <span className="skills-heading-accent">
              Skills
            </span>
          </ChromaHeading>
          <SectionReveal
            fromVars={{ opacity: 0, y: 20 }}
            toVars={{ opacity: 1, y: 0 }}
            duration={0.8}
            delay={0.2}
            start="top 85%"
          >
            <p className="skills-sub">
              Technologies and tools I use to bring ideas to life
            </p>
          </SectionReveal>
        </div>

        {/* Category filter pills */}
        <div className="skills-filters">
          {CATEGORIES.map((cat, ci) => (
            <button
              key={cat.label}
              className="filter-pill"
              style={{ "--cat-accent": cat.accent }}
              onMouseEnter={() => handleFilterEnter(ci)}
              onMouseLeave={handleFilterLeave}
            >
              <span className="filter-pill-index">{String(ci + 1).padStart(2, "0")}</span>
              <span className="filter-pill-label">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Skill field — tiles are absolutely positioned by GSAP */}
        <div className="constellation-field" ref={fieldRef}>
          {allSkillsFlat.map(({ skill, catIndex, index }) => (
            <div
              key={skill.name}
              className="skill-tile-mag"
              data-tile-index={index}
              style={{ "--skill-color": skill.color }}
            >
              <span className="skill-icon-wrap" style={{ color: skill.color }}>
                {skill.icon}
              </span>
              <span className="skill-tile-name">{skill.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .skills-section {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          padding: clamp(0.8rem, 2vh, 1.6rem) clamp(1rem, 3vw, 2rem);
          background: hsl(var(--background));
        }

        .skills-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          gap: clamp(1.1rem, 2.2vh, 1.8rem);
        }

        /* ── Eyebrow row — mirrors "Selected Work" header from Projects ── */
        .skills-eyebrow-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-shrink: 0;
        }

        .skills-eyebrow {
          font-family: var(--font-space-grotesk);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: hsl(var(--foreground) / 0.32);
          white-space: nowrap;
        }

        .skills-eyebrow-rule {
          flex: 1;
          height: 1px;
          background: hsl(var(--foreground) / 0.08);
        }

        .skills-eyebrow-count {
          font-family: var(--font-space-grotesk);
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          color: hsl(var(--foreground) / 0.32);
        }

        .skills-heading-wrap {
          text-align: center;
          flex-shrink: 0;
        }

        .skills-heading {
          font-size: clamp(1.9rem, 3.6vw, 3.1rem) !important;
          font-weight: 800;
          margin-bottom: 0.2rem;
        }

        .skills-heading-accent {
          color: ${BRAND};
        }

        .skills-sub {
          color: hsl(var(--foreground) / 0.45);
          font-size: clamp(0.74rem, 1vw, 0.88rem);
          margin: 0;
        }

        /* ── Filter pills — numbered, monospace, amber-keyed on hover ── */
        .skills-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          justify-content: center;
          flex-shrink: 0;
        }

        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: clamp(0.62rem, 0.85vw, 0.72rem);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--cat-accent);
          background: color-mix(in srgb, var(--cat-accent) 7%, transparent);
          border: 1px solid color-mix(in srgb, var(--cat-accent) 24%, transparent);
          border-radius: 999px;
          padding: 0.45rem 1.05rem 0.45rem 0.7rem;
          cursor: default;
          font-family: var(--font-space-grotesk);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      background 0.3s ease, border-color 0.3s ease,
                      box-shadow 0.3s ease;
          white-space: nowrap;
        }

        .filter-pill-index {
          font-size: 0.62em;
          opacity: 0.55;
          letter-spacing: 0;
        }

        .filter-pill:hover {
          transform: translateY(-3px) scale(1.06);
          background: color-mix(in srgb, var(--cat-accent) 20%, transparent);
          border-color: color-mix(in srgb, var(--cat-accent) 70%, transparent);
          box-shadow: 0 14px 32px -10px color-mix(in srgb, var(--cat-accent) 70%, transparent);
        }

        /* ── Skill field ── */
        .constellation-field {
          position: relative;
          width: 100%;
          /* height set dynamically by JS */
          min-height: 300px;
        }

        /* ── Individual tile — restrained at rest, explosive on hover ── */
        .skill-tile-mag {
          position: absolute;
          width: 76px;
          height: 76px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          background: color-mix(in srgb, var(--skill-color) 4%, hsl(var(--background)));
          border: 1px solid color-mix(in srgb, var(--skill-color) 14%, transparent);
          cursor: default;
          overflow: hidden;
          will-change: transform, opacity, filter;
        }

        .skill-icon-wrap {
          font-size: 1.5rem;
          line-height: 1;
          position: relative;
          z-index: 1;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
        }

        .skill-tile-mag:hover .skill-icon-wrap {
          transform: scale(1.25) translateY(-2px);
          filter: drop-shadow(0 0 9px var(--skill-color));
        }

        .skill-tile-mag:hover {
          z-index: 20;
        }

        .skill-tile-name {
          font-size: clamp(0.46rem, 0.65vw, 0.56rem);
          font-weight: 700;
          text-align: center;
          line-height: 1.1;
          color: hsl(var(--foreground) / 0.62);
          position: relative;
          z-index: 1;
          white-space: nowrap;
          font-family: var(--font-space-grotesk);
          letter-spacing: 0.03em;
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .filter-pill {
            font-size: 0.6rem;
            padding: 0.4rem 0.85rem 0.4rem 0.6rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .skill-tile-mag, .filter-pill, .skill-icon-wrap {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
};