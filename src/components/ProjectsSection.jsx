import { useMemo, useState } from "react";
import "./ProjectsSection.css";

const PROJECTS = [
  {
    title: "Nexus Web App",
    category: "Full Stack",
    description:
      "Role-based web platform with secure auth, dashboard analytics, and real-time updates.",
    tech: ["React", "Node.js", "MongoDB"],
  },
  {
    title: "Cipher Security",
    category: "Backend",
    description:
      "Security-focused API service with token management, permission checks, and audit trails.",
    tech: ["Python", "FastAPI", "JWT"],
  },
  {
    title: "Aurora Dashboard",
    category: "Frontend",
    description:
      "Performance dashboard with interactive charts and clean data drill-down views.",
    tech: ["TypeScript", "D3.js", "REST API"],
  },
  {
    title: "Pulse Analytics",
    category: "Data",
    description:
      "Event analytics pipeline that tracks usage metrics and exposes actionable insights.",
    tech: ["JavaScript", "Express", "PostgreSQL"],
  },
  {
    title: "Vertex 3D Renderer",
    category: "Graphics",
    description:
      "Interactive 3D viewer optimized for smooth rendering and intuitive scene controls.",
    tech: ["Three.js", "WebGL", "GLSL"],
  },
  {
    title: "Phantom CLI Tool",
    category: "Developer Tools",
    description:
      "Automation CLI for local workflows with config profiles and command chaining.",
    tech: ["Python", "Bash", "Linux"],
  },
  {
    title: "Solaris Platform",
    category: "Systems",
    description:
      "Scalable service architecture for modular features and low-latency data access.",
    tech: ["Node.js", "React", "Redis"],
  },
  {
    title: "Matrix Algorithm Lab",
    category: "Algorithms",
    description:
      "Algorithm experimentation project focused on optimization and benchmarking.",
    tech: ["C++", "Python", "Hadoop"],
  },
];

export const ProjectsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredProject = useMemo(() => PROJECTS[activeIndex], [activeIndex]);

  return (
    <section id="projects" className="ps-section">
      <div className="ps-container">
        <div className="ps-heading-wrap">
          <p className="ps-eyebrow">Portfolio</p>
          <h2 className="ps-heading">Projects Built with Engineering Focus</h2>
          <p className="ps-intro">
            A curated selection of projects that reflect my strengths in backend
            systems, product thinking, and clean implementation.
          </p>
        </div>

        <div className="ps-layout">
          <article className="ps-featured-card">
            <div className="ps-image-wrap">
              <img
                src={`/projects/img${activeIndex + 1}.jpg`}
                alt={featuredProject.title}
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="ps-featured-content">
              <div className="ps-featured-meta">
                <span>{featuredProject.category}</span>
                <span>Featured Project</span>
              </div>
              <h3>{featuredProject.title}</h3>
              <p>{featuredProject.description}</p>
              <ul className="ps-tech-list">
                {featuredProject.tech.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>

          <div className="ps-project-list">
            {PROJECTS.map((project, index) => (
              <button
                key={project.title}
                type="button"
                className={`ps-project-item${activeIndex === index ? " is-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-pressed={activeIndex === index}
              >
                <span className="ps-project-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="ps-project-copy">
                  <h4>{project.title}</h4>
                  <p>{project.category}</p>
                </div>
                <span className="ps-project-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
