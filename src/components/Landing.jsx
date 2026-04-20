import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { FluidSimulation } from "./FluidSimulation";

// Register the Observer plugin
gsap.registerPlugin(Observer);

// --- Internal Typewriter Component ---
const Typewriter = ({ text, speed = 150, deleteSpeed = 100, pause = 2000 }) => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(speed);

  useEffect(() => {
    const words = ["fullstack", "machine learning", "creative coding"];
    let timer;
    const handleTyping = () => {
      const i = loopNum % words.length;
      const fullText = words[i];

      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      setTypingSpeed(isDeleting ? deleteSpeed : speed);

      if (!isDeleting && displayText === fullText) {
        timer = setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        timer = setTimeout(handleTyping, 500);
      } else {
        timer = setTimeout(handleTyping, typingSpeed);
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum, typingSpeed, speed, deleteSpeed, pause]);

  return (
    <span>
      {text} <span className="text-purple-500 font-bold">{displayText}</span>
      <span className="animate-pulse">|</span>
    </span>
  );
};

const FLUID_CONFIG = {
  simResolution: 128,
  dyeResolution: 512,
  splatRadius: 0.25,
  velocityDissipation: 0.88,
  dyeDissipation: 0.90,
  vorticity: 15,
  pressureDissipation: 0.8,
  pressureIterations: 20,
  threshold: 0.3,
  edgeSoftness: 0.01,
  inkColor: [1, 1, 1], // white ink — difference blend does the inversion
};

export const Landing = ({ playReverse = false, onReverseComplete }) => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const MAX_PROGRESS = 1;
  const NAVIGATE_THRESHOLD = 0.98;

  const containerRef = useRef(null);
  const zoomContainerRef = useRef(null);
  const vaTextRef = useRef(null);
  const rTextRef = useRef(null);
  const unTextRef = useRef(null);
  const overlayRef = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const fluidCanvasRef = useRef(null);
  const fluidSimRef = useRef(null);

  const progress = useRef({ value: playReverse ? MAX_PROGRESS : 0 });
  const targetProgress = useRef(playReverse ? MAX_PROGRESS : 0);
  const isNavigating = useRef(false);
  const ctx = useRef(null);

  // Detect dark mode
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Lock body scroll only in forward mode
  useEffect(() => {
    if (playReverse) return;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, [playReverse]);

  // Keep body background in sync
  useEffect(() => {
    const bgColor = isDarkMode ? "#000000" : "#ffffff";
    document.body.style.backgroundColor = bgColor;
  }, [isDarkMode]);

  // Mount FluidSimulation onto the canvas
  useEffect(() => {
    if (!fluidCanvasRef.current) return;
    fluidSimRef.current = new FluidSimulation(fluidCanvasRef.current, FLUID_CONFIG);
  }, []);

  // Main Animation Logic (GSAP)
  useLayoutEffect(() => {
    ctx.current = gsap.context(() => {
      const render = () => {
        const p = progress.current.value;

        const scale = 1 + p * 20;
        const textOpacity = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4);
        const overlayOpacity = p < 0.7 ? 0 : Math.min(1, (p - 0.7) / 0.3);
        const chromaticIntensity = Math.sin(p * Math.PI) * 3;

        if (zoomContainerRef.current) {
          gsap.set(zoomContainerRef.current, { scale, opacity: textOpacity });
        }

        if (overlayRef.current) {
          gsap.set(overlayRef.current, { opacity: overlayOpacity });
        }

        if (scrollIndicatorRef.current && !playReverse) {
          const indicatorOpacity = p < 0.2 ? 1 - p / 0.2 : 0;
          gsap.set(scrollIndicatorRef.current, { opacity: indicatorOpacity });
        }

        const redShadow = `${chromaticIntensity}px 0 0 rgba(255, 0, 0, 0.5)`;
        const cyanShadow = `${-chromaticIntensity}px 0 0 rgba(0, 255, 255, 0.5)`;
        const rGlow = `0 0 ${20 + p * 30}px rgba(168, 85, 247, 0.6)`;
        const rRed = `${chromaticIntensity * 1.5}px 0 0 rgba(255, 0, 0, 0.6)`;
        const rCyan = `${-chromaticIntensity * 1.5}px 0 0 rgba(0, 255, 255, 0.6)`;

        if (vaTextRef.current) vaTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;
        if (unTextRef.current) unTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;
        if (rTextRef.current) rTextRef.current.style.textShadow = `${rRed}, ${rCyan}, ${rGlow}`;

        if (!playReverse && p >= NAVIGATE_THRESHOLD && !isNavigating.current) {
          isNavigating.current = true;
          setTimeout(() => navigate("/home"), 50);
        }
      };

      render();

      if (playReverse) {
        gsap.to(progress.current, {
          value: 0,
          duration: 1.5,
          ease: "power2.inOut",
          onUpdate: render,
          onComplete: () => {
            if (onReverseComplete) onReverseComplete();
          },
        });
      } else {
        Observer.create({
          target: window,
          type: "wheel,touch,pointer",
          preventDefault: true,
          tolerance: 10,
          onChange: (self) => {
            if (isNavigating.current) return;

            const event = self.event || {};
            const isTouchLike =
              (event.type && event.type.startsWith("touch")) ||
              event.pointerType === "touch";

            const delta = self.deltaY || self.velocityY;
            const sensitivity = isTouchLike ? 0.004 : 0.0035;
            const adjustedDelta = isTouchLike ? -delta : delta;

            targetProgress.current = gsap.utils.clamp(
              0,
              MAX_PROGRESS,
              targetProgress.current + adjustedDelta * sensitivity
            );

            gsap.to(progress.current, {
              value: targetProgress.current,
              duration: 0.3,
              overwrite: true,
              ease: "power2.out",
              onUpdate: render,
            });
          },
        });
      }
    }, containerRef);

    return () => ctx.current.revert();
  }, [navigate, playReverse, onReverseComplete]);

  return (
    <>
      <Navbar />

      <div
        ref={containerRef}
        className={`fixed inset-0 w-full h-screen overflow-hidden flex items-center justify-center ${
          isDarkMode ? "bg-black" : "bg-gray-50"
        }`}
        style={{
          backgroundColor: isDarkMode ? "#000000" : "#f9fafb",
          backfaceVisibility: "hidden",
          isolation: "isolate", 
        }}
      >
        {/* Fluid Simulation Canvas — sits above content, inverts via blend mode */}
        <canvas
          ref={fluidCanvasRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 40,
            pointerEvents: "none",
            mixBlendMode: "difference",
            
          }}
        />

        <div
          ref={zoomContainerRef}
          style={{
            willChange: "transform, opacity",
            position: "absolute",
            zIndex: 10,
            transformOrigin: "center",
            filter: "contrast(1.1) brightness(1.05)",
          }}
        >
          <div
            className={`font-medium tracking-wide select-none absolute left-2 -top-14 md:-top-[3.5vw] text-lg md:text-[1.5vw] ${
              isDarkMode ? "text-white/80" : "text-black/80"
            }`}
          >
            Hey I'm
          </div>

          <h1
            className={`text-[9.5vw] font-black leading-none tracking-tighter select-none flex font-Melete ${
              isDarkMode ? "text-white" : "text-black"
            }`}
          >
            <span ref={vaTextRef}>VA</span>
            <span ref={rTextRef} className="relative text-purple-500">
              R
            </span>
            <span ref={unTextRef}>UN</span>
          </h1>

          <div
            className={`font-medium tracking-wide select-none absolute right-2 -bottom-12 md:-bottom-[2.5vw] text-right text-lg md:text-[1.5vw] ${
              isDarkMode ? "text-white/80" : "text-black/80"
            }`}
            style={{ minWidth: "300px" }}
          >
            <Typewriter text="I love" />
          </div>
        </div>

        <div
          ref={overlayRef}
          style={{
            willChange: "opacity",
            position: "absolute",
            inset: 0,
            zIndex: 20,
            pointerEvents: "none",
            backgroundColor: "#9333ea",
            backfaceVisibility: "hidden",
            opacity: 0,
          }}
        />

        {!playReverse && (
          <div
            ref={scrollIndicatorRef}
            style={{
              position: "absolute",
              bottom: "2.5rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              className={`text-sm font-medium ${
                isDarkMode ? "text-white/50" : "text-black/50"
              }`}
            >
              Scroll to enter
            </span>
            <ArrowDown
              className={`w-5 h-5 animate-bounce ${
                isDarkMode ? "text-white/50" : "text-black/50"
              }`}
            />
          </div>
        )}
      </div>
    </>
  );
};