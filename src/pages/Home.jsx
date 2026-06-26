import { Skills } from "../components/Skills";
import { ProjectsSection } from "../components/ProjectsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { useEffect, useRef } from "react";

export const Home = ({ onScrollToTop }) => {
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handle = () => {
      const curr = window.scrollY;
      if (curr <= 10 && curr < lastScrollY.current && onScrollToTop) {
        onScrollToTop();
      }
      lastScrollY.current = curr;
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, [onScrollToTop]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <main>
        <Skills />
        <ProjectsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};