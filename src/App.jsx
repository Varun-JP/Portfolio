import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Landing } from "./components/Landing";
import { Home } from "./pages/Home";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";

function App() {
  const [isLoading, setIsLoading]       = useState(true);
  const [phase, setPhase]               = useState("forward");
  const [aboutTexture, setAboutTexture] = useState(null);

  const handlePortalComplete = () => {
    setPhase("hidden");
    document.body.style.overflow = "";
    document.body.style.height   = "";
  };

  const handleScrollToTop = () => {
    if (phase === "hidden") {
      document.body.style.overflow = "hidden";
      document.body.style.height   = "100vh";
      setPhase("reverse");
    }
  };

  const handleReverseComplete = () => setPhase("forward");

  return (
    <BrowserRouter>
      <Toaster />
      {isLoading && <LoadingScreen onLoadComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <>
          <div style={{ position: "relative", zIndex: 0 }}>
            <Home onScrollToTop={handleScrollToTop} aboutTexture={aboutTexture} />
          </div>

          {/* Landing passes its captured texture up so Home can reuse it */}
          <Landing
            phase={phase}
            onComplete={handlePortalComplete}
            onReverseComplete={handleReverseComplete}
            onTextureReady={setAboutTexture}
          />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;