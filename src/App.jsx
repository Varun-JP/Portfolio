import { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Landing } from "./components/Landing";
import { Home } from "./pages/Home";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";
import { useGlobalFluid, FLUID_CONFIG } from "./components/useGlobalFluid";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const fluidCanvasRef = useGlobalFluid();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Keep splatRadius at 0.8 for Landing + About.
  // Once the user scrolls into Skills or Projects, shrink it to 0.2.
  // Restore 0.8 if they scroll back above both sections.
  useEffect(() => {
    if (isMobile || isLoading) return;

    const skillsEl   = document.getElementById("skills");
    const projectsEl = document.getElementById("projects");

    const targets = [skillsEl, projectsEl].filter(Boolean);
    if (!targets.length) return;

    // Track which sections are currently "active" (in view or scrolled past).
    const activeSet = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pastTop = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          const inView  =  entry.isIntersecting;

          if (inView || pastTop) {
            activeSet.add(entry.target);
          } else {
            activeSet.delete(entry.target);
          }
        });

        // Shrink brush as soon as either section is reached; restore when
        // the user scrolls back up above both.
        FLUID_CONFIG.splatRadius = activeSet.size > 0 ? 0.2 : 0.8;
      },
      { threshold: 0, rootMargin: "0px 0px -20% 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isMobile, isLoading]);

  return (
    <BrowserRouter>
      {/*
        zIndex 16 — above the 2D VARUN text (z:15) so exclusion blending
        works on the typography, but BELOW the 3D canvas wrapper (z:17).
        The WebGL canvas is alpha:true so the fluid shows through its
        transparent background — it just won't blend with the 3D R geometry,
        which prevents the white+amber→blue artifact.
      */}
      {!isMobile && (
        <canvas
          ref={fluidCanvasRef}
          style={{
            position:      "fixed",
            top:           0,
            left:          0,
            width:         "100%",
            height:        "100%",
            zIndex:        16,
            pointerEvents: "none",
            mixBlendMode:  "exclusion",
          }}
        />
      )}

      <Toaster />

      {isLoading && <LoadingScreen onLoadComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <>
          <Landing />
            <Home />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;