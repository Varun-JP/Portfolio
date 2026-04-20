import { useEffect, useState, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLocation } from "react-router-dom";

export const CircularScrollIndicator = () => {
  const { isDark } = useTheme();
  const [rotation, setRotation] = useState(0);
  /* eslint-disable */
  const [activeSection, setActiveSection] = useState(0);
  const location = useLocation();

  const sections = ["about", "skills", "projects", "contact"]; // Removed "hero"
  const sectionElements = useRef([]);

  // Only show on /home route
  const isHomePage = location.pathname === '/home';

  useEffect(() => {
    if (!isHomePage) return;

    sectionElements.current = sections.map(id => document.getElementById(id));

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const percent = Math.min((scrollTop / docHeight) * 100, 100);

          setRotation((percent / 100) * 360);

          const viewportMiddle = window.innerHeight / 2;
          let current = 0;

          sectionElements.current.forEach((section, index) => {
            if (section) {
              const rect = section.getBoundingClientRect();
              if (rect.top <= viewportMiddle && rect.bottom > viewportMiddle) {
                current = index;
              }
            }
          });

          setActiveSection(current);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  // Don't render on landing page
  if (!isHomePage) return null;

  // Dark Theme Component
  const DarkThemeIndicator = () => {
    return (
      <div className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 z-50 items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-orange-500/20 blur-md"></div>
          <div className="absolute inset-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10"></div>

          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="url(#gradient-bg)" strokeWidth="2" opacity="0.2" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeDasharray={`${(rotation / 360) * 125.6} 125.6`}
              strokeLinecap="round"
              className="transition-all duration-100"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,107,53,0.6))' }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#ff6b35" />
              </linearGradient>
              <linearGradient id="gradient-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          <div
            className="absolute w-3 h-3 rounded-full shadow-lg transition-all duration-300"
            style={{
              top: '50%',
              left: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ffa500, #ff6b35)',
              boxShadow: '0 0 12px rgba(255,107,53,0.9), 0 0 20px rgba(255,107,53,0.5)',
              transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-35px)`,
              transformOrigin: 'center',
            }}
          >
            <div className="absolute inset-0.5 rounded-full bg-white/40"></div>
            <div
              className="absolute inset-0 rounded-full animate-ping border border-orange-400/60"
              style={{ animationDuration: '2s' }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  // Light Theme Component
  const LightThemeIndicator = () => {
    return (
      <div className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 z-50 items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-lg"></div>
          <div className="absolute inset-0.5 rounded-full bg-white border-2 border-gray-200 shadow-lg"></div>

          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="2" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="url(#light-gradient)"
              strokeWidth="2"
              strokeDasharray={`${(rotation / 360) * 125.6} 125.6`}
              strokeLinecap="round"
              className="transition-all duration-100"
              style={{ filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.4))' }}
            />
            <defs>
              <linearGradient id="light-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-purple-600">
              {Math.round((rotation / 360) * 100)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return isDark ? <DarkThemeIndicator /> : <LightThemeIndicator />;
};