import { Navbar } from "@/components/Navbar";
import { Skills } from "../components/Skills";
import { ProjectsSection } from "../components/ProjectsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { Landing } from "@/components/Landing";
import { ChromaHeading, SectionReveal } from "@/components/SectionReveal";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const lastScrollY = useRef(window.scrollY);
  const scrollTimeout = useRef(null);
  const hasRestoredScroll = useRef(false);
  const [showDezoomOverlay, setShowDezoomOverlay] = useState(false);

  // Detect which section is currently visible and save it
  useEffect(() => {
    const sections = ['about', 'skills', 'projects', 'contact'];
    
    const saveCurrentSection = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            sessionStorage.setItem('currentSection', sectionId);
            break;
          }
        }
      }
    };

    let scrollTimer;
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(saveCurrentSection, 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
      saveCurrentSection(); // Save on unmount
    };
  }, []);

  // Restore scroll to the correct section on mount
  useEffect(() => {
    if (!hasRestoredScroll.current) {
      hasRestoredScroll.current = true;
      
      // Check if we have a hash in the URL (e.g., /home#skills)
      const hash = location.hash.replace('#', '');
      const savedSection = sessionStorage.getItem('currentSection');
      
      // Determine which section to scroll to
      const targetSection = hash || savedSection || 'about';
      
      // Wait for content to render, then scroll
      const timer = setTimeout(() => {
        const element = document.getElementById(targetSection);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else {
          // Fallback to top if section not found
          window.scrollTo(0, 0);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  // Detect scroll at top to trigger DEZOOM OVERLAY
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY.current;
      
      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      // If at the very top (0-10px) and scrolling up, show dezoom overlay
      if (scrollingUp && currentScrollY <= 10 && !showDezoomOverlay) {
        scrollTimeout.current = setTimeout(() => {
          setShowDezoomOverlay(true);
        }, 100);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [showDezoomOverlay]);

  // Handle when dezoom animation completes
  const handleDezoomComplete = () => {
    // Clear saved section when going back to landing
    sessionStorage.removeItem('currentSection');
    // Navigate to landing page at 0% progress
    navigate('/', { replace: true, state: {} });
  };

  const handleBackToHero = () => {
    if (showDezoomOverlay) return;
    setShowDezoomOverlay(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      
      <main>
        {/* About Section - Mobile Optimized */}
        <section 
          id="about" 
          className="min-h-screen flex items-center justify-center py-16 md:py-20 px-4 md:px-6 relative overflow-hidden"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #111111 0%, #0a0a0a 45%, #181818 100%)'
              : 'linear-gradient(135deg, hsl(210,40%,93%) 0%, hsl(212,38%,88%) 50%, hsl(210,40%,84%) 100%)'
          }}
        >
          {/* Subtle overlay pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: isDark
              ? 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.06) 1px, transparent 0)'
              : 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.06) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
          
          <div className="max-w-4xl mx-auto w-full relative z-10">
            {/* Heading — chromatic aberration zoom reveal */}
            <ChromaHeading
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 md:mb-12 text-center"
              start="top 80%"
            >
              <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                About Me
              </span>
            </ChromaHeading>

            {/* Content — staggered zoom-up reveal on each paragraph */}
            <SectionReveal
              className="space-y-4 sm:space-y-5 md:space-y-6 text-foreground/75 leading-relaxed"
              stagger={0.15}
              fromVars={{ opacity: 0, y: 35, scale: 0.95 }}
              toVars={{ opacity: 1, y: 0, scale: 1 }}
              duration={0.9}
              start="top 82%"
            >
              {/* Paragraph 1 */}
              <p className="text-sm sm:text-base md:text-lg text-center">
                I'm a Computer Science graduate (2025) with a strong focus on fundamentals, including data structures, algorithms, and building systems with a clear understanding of how they work beneath the surface.
              </p>

              {/* Paragraph 2 */}
              <p className="text-sm sm:text-base md:text-lg text-center">
                My learning approach is deliberate and structured. I work through problems until the underlying logic is clear and intuitive, which has shaped how I approach coding, debugging, and system design.
              </p>

              {/* Paragraph 3 — hidden on mobile */}
              <p className="hidden sm:block text-sm sm:text-base md:text-lg text-center">
                I'm particularly interested in backend development, databases, and applying AI in ways that are practical and thoughtfully integrated.
              </p>

              {/* Paragraph 4 — hidden on mobile/tablet */}
              <p className="hidden md:block text-base md:text-lg text-center">
                Currently, I'm focused on improving my problem-solving efficiency, deepening my engineering skills, and preparing for roles where quality, ownership, and long-term impact are valued.
              </p>
            </SectionReveal>

            {/* Decorative line — fade + scale reveal */}
            <SectionReveal
              className="mt-6 sm:mt-8 md:mt-12 flex justify-center"
              fromVars={{ opacity: 0, scaleX: 0 }}
              toVars={{ opacity: 1, scaleX: 1 }}
              duration={0.8}
              ease="power2.out"
              start="top 90%"
            >
              <div className="h-0.5 sm:h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-transparent via-foreground/40 to-transparent rounded-full" />
            </SectionReveal>
          </div>
        </section>

        <Skills />
        <ProjectsSection />
        <ContactSection />
      </main>

      <Footer onBackToHero={handleBackToHero} />

      {/* Dezoom Overlay - Shows Landing component in reverse mode */}
      {showDezoomOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
        }}>
          <Landing 
            playReverse={true} 
            onReverseComplete={handleDezoomComplete}
          />
        </div>
      )}
    </div>
  );
};