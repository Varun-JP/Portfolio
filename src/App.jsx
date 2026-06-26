import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Landing } from "./components/Landing";
import { Home } from "./pages/Home";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase]         = useState("forward");

  const handlePortalComplete  = () => setPhase("hidden");
  const handleScrollToTop     = () => { if (phase === "hidden") setPhase("reverse"); };
  const handleReverseComplete = () => setPhase("forward");

  return (
    <BrowserRouter>
      <Toaster />
      {isLoading && <LoadingScreen onLoadComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <>
          {/* Home always in DOM at z-index 0 — visible once Landing fades out */}
          <div style={{ position: "relative", zIndex: 0 }}>
            <Home onScrollToTop={handleScrollToTop} />
          </div>

          {/* Landing fixed overlay — fades out on portal, back in on dezoom */}
          <Landing
            phase={phase}
            onComplete={handlePortalComplete}
            onReverseComplete={handleReverseComplete}
          />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;