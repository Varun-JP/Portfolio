import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Landing } from "./components/Landing";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";
import { FluidSimulation } from "./components/FluidSimulation";

const FLUID_CONFIG = {
  simResolution: 128,
  dyeResolution: 512,
  splatRadius: 0.15,
  velocityDissipation: 0.88,
  dyeDissipation: 0.87,
  vorticity: 15,
  pressureDissipation: 0.8,
  pressureIterations: 20,
  threshold: 0.03,
  edgeSoftness: 0.01,
  inkColor: [1, 1, 1],
};

function LandingWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const playReverse = location.state?.playReverse || false;

  const handleReverseComplete = () => {
    navigate('/', { replace: true, state: {} });
  };

  return <Landing playReverse={playReverse} onReverseComplete={handleReverseComplete} />;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const fluidCanvasRef = useRef(null);

  useEffect(() => {
    if (!fluidCanvasRef.current) return;
    new FluidSimulation(fluidCanvasRef.current, FLUID_CONFIG);
  }, []);

  return (
    <>
      {/* Global fluid canvas — sits above all pages */}
      <canvas
        ref={fluidCanvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: "none",
          mixBlendMode: "difference",
        }}
      />

      <Toaster />
      {isLoading && <LoadingScreen onLoadComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingWrapper />} />
            <Route path="/home" element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/' && !location.state?.playReverse) {
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
  }, [location.pathname, location.state]);

  return null;
}

export default App;