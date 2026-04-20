import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export const Footer = ({ onBackToHero }) => {
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowArrow(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <footer className="py-6 px-4 relative border-t border-border mt-12 flex flex-wrap justify-between items-center transition-colors duration-300 bg-background">
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Varun JP. All rights reserved.
        </p>
      </footer>

      {showArrow && (
        <button
          type="button"
          onClick={onBackToHero}
          aria-label="Back to landing"
          className="fixed bottom-3 right-4 z-50 p-3 rounded-full bg-primary/30 hover:bg-primary text-white shadow-lg transition-colors duration-300"
        >
          <ArrowUp size={28} className="text-white" />
        </button>
      )}
    </>
  );
};