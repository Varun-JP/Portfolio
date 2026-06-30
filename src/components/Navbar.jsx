import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Moon, Sun, Home, User, Code, Box, Mail } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

const navItems = [
  { name: "Home",     href: "top",      icon: <Home size={18} /> },
  { name: "Skills",   href: "skills",   icon: <Code size={18} /> },
  { name: "Projects", href: "projects", icon: <Box  size={18} /> },
  { name: "Contact",  href: "contact",  icon: <Mail size={18} /> },
];

export const Navbar = () => {
  const [activeSection, setActiveSection] = useState("top");
  const [isScrolled,    setIsScrolled]    = useState(false);
  const [showNavbar,    setShowNavbar]    = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // ── Show/hide on scroll direction ─────────────────────────────────────────
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setShowNavbar(y < lastScrollY || y < 50);
      setIsScrolled(y > 10);
      lastScrollY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Highlight active section ───────────────────────────────────────────────
  useEffect(() => {
    const sectionIds = ["skills", "projects", "contact"];
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.8) {
        setActiveSection("top");
        return;
      }
      const scrollMid = window.scrollY + window.innerHeight / 2;
      let current = "skills";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && scrollMid >= el.offsetTop) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Click handler ──────────────────────────────────────────────────────────
  const handleNavClick = (e, item) => {
    e.preventDefault();

    // About → navigate to /about route
    if (item.route) {
      navigate(item.route);
      return;
    }

    // Home → scroll to top
    if (item.href === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Everything else → scroll to section ID
    const el = document.getElementById(item.href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className={cn(
        "fixed w-full z-50 transition-all duration-500 flex justify-center",
        isScrolled ? "py-2" : "py-3",
        showNavbar ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
    >
      {/* Desktop navbar */}
      <div className="hidden md:flex space-x-4 bg-background/30 backdrop-blur-md rounded-full px-4 py-2 shadow-sm">
        {navItems.map((item, key) => (
          <a
            key={key}
            href={item.route ?? `#${item.href}`}
            onClick={(e) => handleNavClick(e, item)}
            className={cn(
              "group px-4 py-1 rounded-full transition-colors duration-300",
              activeSection === item.href
                ? "bg-amber-400 text-black font-semibold shadow-md"
                : "text-foreground/80 hover:bg-amber-100 hover:text-amber-700"
            )}
          >
            <span className="relative flex overflow-hidden h-[1.2em]">
              {item.name.split("").map((char, i) => {
                const delay = `${(item.name.length - 1 - i) * 30}ms`;
                return (
                  <span key={i} className="relative flex flex-col overflow-hidden h-[1.2em]">
                    <span
                      className="translate-y-0 transition-transform duration-300 ease-in-out group-hover:-translate-y-full"
                      style={{ transitionDelay: delay }}
                    >
                      {char}
                    </span>
                    <span
                      className="absolute translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0"
                      style={{ transitionDelay: delay }}
                    >
                      {char}
                    </span>
                  </span>
                );
              })}
            </span>
          </a>
        ))}

        <button
          onClick={toggleTheme}
          className="ml-2 px-3 py-1 rounded-full bg-transparent text-foreground hover:bg-background/10 transition-colors duration-300 flex items-center justify-center"
        >
          {isDark ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-blue-500" />}
        </button>
      </div>

      {/* Mobile navbar */}
      <div
        className="flex flex-col md:hidden bg-background/30 backdrop-blur-md rounded-l-full shadow-md p-2 space-y-2 fixed top-4 right-4 transition-all duration-500"
        style={{
          transform: showNavbar ? "translateY(0)" : "translateY(-150%)",
          opacity:   showNavbar ? 1 : 0,
        }}
      >
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-transparent text-foreground hover:bg-background/10 transition-colors duration-300 flex items-center justify-center"
        >
          {isDark ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-blue-500" />}
        </button>

        {navItems.map((item, key) => (
          <a
            key={key}
            href={item.route ?? `#${item.href}`}
            onClick={(e) => handleNavClick(e, item)}
            className={cn(
              "p-2 rounded-full transition-colors duration-300 flex items-center justify-center",
              activeSection === item.href
                ? "bg-amber-400 text-black font-semibold shadow-md"
                : "text-foreground/80 hover:bg-amber-100 hover:text-amber-700"
            )}
          >
            {item.icon}
          </a>
        ))}
      </div>
    </nav>
  );
};