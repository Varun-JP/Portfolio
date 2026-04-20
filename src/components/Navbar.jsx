import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Moon, Sun, Home, User, Code, Box, Mail } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { name: "Home", href: "/", icon: <Home size={18} /> },
  { name: "About", href: "#about", icon: <User size={18} /> },
  { name: "Skills", href: "#skills", icon: <Code size={18} /> },
  { name: "Projects", href: "#projects", icon: <Box size={18} /> },
  { name: "Contact", href: "#contact", icon: <Mail size={18} /> },
];

export const Navbar = () => {
  const [activeSection, setActiveSection] = useState("/");
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === '/home';
  const isLandingPage = location.pathname === '/';

  // Update active section based on current page
  useEffect(() => {
    if (isLandingPage) {
      setActiveSection('/');
    } else if (isHomePage) {
      // Set active section based on hash or default to about
      const hash = location.hash || '#about';
      setActiveSection(hash);
    }
  }, [isLandingPage, isHomePage, location.hash]);

  // Scroll direction tracking (only on home page)
  useEffect(() => {
    if (!isHomePage) return;

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowNavbar(true);
      } else {
        setShowNavbar(false);
      }

      setIsScrolled(currentScrollY > 10);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  // Highlight active section while scrolling (only on home page)
  useEffect(() => {
    if (!isHomePage) return;

    const sections = navItems
      .filter(item => item.href.startsWith('#'))
      .map((item) => ({
        id: item.href,
        element: document.querySelector(item.href)
      }));
    
    const onScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight / 2;
      
      for (const section of sections) {
        if (section.element && scrollPos >= section.element.offsetTop) {
          setActiveSection(section.id);
        }
      }
    };
    
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomePage]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    
    if (href === '/') {
      // Going to landing page
      if (isHomePage) {
        // Trigger smooth reverse zoom by navigating with state
        navigate('/', { state: { playReverse: true } });
      } else {
        navigate('/');
      }
    } else if (href.startsWith('#')) {
      // Hash navigation
      if (isLandingPage) {
        // If on landing page, navigate to home with hash
        navigate(`/home${href}`);
        setTimeout(() => {
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 100);
      } else {
        // Already on home page, just scroll
        const element = document.querySelector(href);
        if (element) {
          // Update URL hash without triggering navigation
          window.history.pushState(null, '', `/home${href}`);
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    }
  };

  return (
    <nav
      className={cn(
        "fixed w-full z-50 transition-all duration-500 flex justify-center md:justify-center",
        isScrolled ? "py-2" : "py-3",
        showNavbar ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
    >
      {/* Desktop navbar */}
      <div className="hidden md:flex space-x-4 bg-background/30 backdrop-blur-md rounded-full px-4 py-2 shadow-sm">
        {navItems.map((item, key) => (
          <a
            key={key}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            className={cn(
              "px-4 py-1 rounded-full transition-colors duration-300",
              activeSection === item.href
                ? "bg-purple-600 text-white font-semibold shadow-md"
                : "text-foreground/80 hover:bg-purple-200 hover:text-purple-800"
            )}
          >
            {item.name}
          </a>
        ))}

        <button
          onClick={toggleTheme}
          className="ml-2 px-3 py-1 rounded-full bg-transparent text-foreground hover:bg-background/10 transition-colors duration-300 flex items-center justify-center shadow-none"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-yellow-300" />
          ) : (
            <Moon className="h-5 w-5 text-blue-500" />
          )}
        </button>
      </div>

      {/* Mobile navbar */}
      <div 
        className="flex flex-col md:hidden bg-background/30 backdrop-blur-md rounded-l-full shadow-md p-2 space-y-2 fixed top-4 right-4 transition-all duration-500"
        style={{ 
          transform: showNavbar ? 'translateY(0)' : 'translateY(-150%)', 
          opacity: showNavbar ? 1 : 0 
        }}
      >
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-transparent text-foreground hover:bg-background/10 transition-colors duration-300 flex items-center justify-center shadow-none"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-yellow-300" />
          ) : (
            <Moon className="h-5 w-5 text-blue-500" />
          )}
        </button>

        {navItems.map((item, key) => (
          <a
            key={key}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            className={cn(
              "p-2 rounded-full transition-colors duration-300 flex items-center justify-center",
              activeSection === item.href
                ? "bg-purple-600 text-white font-semibold shadow-md"
                : "text-foreground/80 hover:bg-purple-200 hover:text-purple-800"
            )}
          >
            {item.icon}
          </a>
        ))}
      </div>
    </nav>
  );
};