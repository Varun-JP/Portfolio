import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Landing } from "./components/Landing";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";

// Wrapper component to handle landing page with reverse mode
function LandingWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const playReverse = location.state?.playReverse || false;

  const handleReverseComplete = () => {
    // After reverse animation completes, clear the state
    // This resets the landing page to normal forward mode
    navigate('/', { replace: true, state: {} });
  };

  return <Landing playReverse={playReverse} onReverseComplete={handleReverseComplete} />;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      <Toaster />
      {isLoading && <LoadingScreen onLoadComplete={handleLoadComplete} />}
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

// UPDATED: Only scroll to top when navigating TO landing page in forward mode (not reverse)
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Only force scroll to top when going to landing page WITHOUT reverse state
    if (location.pathname === '/' && !location.state?.playReverse) {
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
    // For /home route, do nothing - let browser maintain scroll position
  }, [location.pathname, location.state]);

  return null;
}

export default App;