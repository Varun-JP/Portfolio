import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Landing } from "./components/Landing";
import { Home } from "./pages/Home";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";
import { useGlobalFluid } from "./components/useGlobalFluid";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const fluidCanvasRef = useGlobalFluid();

  return (
    <BrowserRouter>
      {/*
        zIndex 16 — above the 2D VARUN text (z:15) so exclusion blending
        works on the typography, but BELOW the 3D canvas wrapper (z:17).
        The WebGL canvas is alpha:true so the fluid shows through its
        transparent background — it just won't blend with the 3D R geometry,
        which prevents the white+amber→blue artifact.
      */}
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

      <Toaster />

      {isLoading && <LoadingScreen onLoadComplete={() => setIsLoading(false)} />}
      {!isLoading && (
        <>
          <Landing />
          <div style={{ marginTop: "-100vh" }}>
            <Home />
          </div>
        </>
      )}
    </BrowserRouter>
  );
}

export default App;