import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { Navbar } from "./Navbar";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { FluidSimulation } from "./FluidSimulation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import * as THREE from "three";
import html2canvas from "html2canvas";
import { AboutPreview } from "./AboutPreview";

gsap.registerPlugin(Observer);

// ── 3D constants ──────────────────────────────────────────────────────────────
const GROUP_Z    = -3.5;
const CAM_START  =  5.0;
const CAM_END    = -3.3;
const CAM_TRAVEL = CAM_START - CAM_END;

const CAM_X   = -0.128;
const CAM_Y   =  0.615;
const HOLE_X  = -0.128;
const HOLE_Y  =  0.615;
const ABOUT_Z = GROUP_Z - 1.6;

const HOLE_TRI_WORLD = [
  new THREE.Vector3(-0.13915, 0.892795, GROUP_Z),
  new THREE.Vector3(-0.44915, 0.432795, GROUP_Z),
  new THREE.Vector3(0.22509,  0.425002, GROUP_Z),
];

// ── Typewriter ────────────────────────────────────────────────────────────────
const Typewriter = ({ text, words, speed = 150, deleteSpeed = 100, pause = 2000 }) => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting]   = useState(false);
  const [loopNum, setLoopNum]         = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(speed);

  useEffect(() => {
    const wordList = words ?? ["fullstack", "machine learning", "creative coding"];
    let timer;
    const handleTyping = () => {
      const i        = loopNum % wordList.length;
      const fullText = wordList[i];
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
      {text}{" "}
      <span className="text-amber-500 font-bold px-2 py-0.5 rounded-full bg-black">
        {displayText}
      </span>
      <span className="animate-pulse">|</span>
    </span>
  );
};

const FLUID_CONFIG = {
  simResolution: 1.5, dyeResolution: 512, splatRadius: 1,
  velocityDissipation: 0.88, dyeDissipation: 0.92, vorticity: 15,
  pressureDissipation: 0.8, pressureIterations: 1,
  threshold: 0.3, edgeSoftness: 0.01, inkColor: [1, 1, 1],
};

// ── AboutPlane (3D floating screen inside the tunnel) ────────────────────────
// Starts as a tiny, tilted, near-invisible card deep in the tunnel (~p=0.55).
// As the camera flies forward it grows, de-tilts, and becomes fully opaque —
// like a real screen revealed at the end of a corridor (see reference images).
function AboutPlane({ textureData, progress, mouseRef }) {
  const meshRef     = useRef(null);
  const materialRef = useRef(null);
  const { camera }  = useThree();

  const { texture, width, height } = textureData;
  // Final (full) size of the screen at p=1
  const planeHeightFull = 1.6;
  const planeWidthFull  = planeHeightFull * (width / height);

  useFrame(() => {
    const p = progress.current.value;
    const m = mouseRef?.current ?? { x: 0, y: 0 };

    // ── visibility window: appears from p=0.55, fully opaque at p=0.93 ──────
    const APPEAR_START = 0.55;
    const APPEAR_END   = 0.93;
    const rawRamp      = gsap.utils.clamp(0, 1, (p - APPEAR_START) / (APPEAR_END - APPEAR_START));

    // Ease the ramp so it starts slow and accelerates
    const ramp = rawRamp * rawRamp;

    if (!meshRef.current || !materialRef.current) return;

    // ── opacity: 0 → 1 over the ramp, mouse only nudges when visible ─────
    materialRef.current.opacity = ramp;

    // ── tilt: starts strongly tilted, flattens to face camera at end ──────
    // At ramp=0: rotY = ~25°, rotX = ~10° (dramatic angle like reference img 3)
    // At ramp=1: rotY = small mouse parallax only, rotX = 0
    const baseTiltY = THREE.MathUtils.degToRad(25) * (1 - ramp);
    const baseTiltX = THREE.MathUtils.degToRad(10) * (1 - ramp);
    meshRef.current.rotation.y = baseTiltY + m.x * 0.25 * ramp;
    meshRef.current.rotation.x = -baseTiltX + m.y * 0.15 * ramp;

    // ── scale: starts small (0.15×), grows to full 1× at ramp=1 ──────────
    const scaleFactor = 0.15 + 0.85 * ramp;
    meshRef.current.scale.set(scaleFactor, scaleFactor, 1);

    // ── z position: plane starts far away, moves slightly toward camera ───
    // ABOUT_Z is the base; we push it a little closer as we near the end
    const zOffset = (1 - ramp) * (-0.8);
    meshRef.current.position.set(HOLE_X, HOLE_Y, ABOUT_Z + zOffset);
  });

  return (
    <mesh ref={meshRef} position={[HOLE_X, HOLE_Y, ABOUT_Z]}>
      <planeGeometry args={[planeWidthFull, planeHeightFull]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// ── TunnelR ───────────────────────────────────────────────────────────────────
function TunnelR({ progress, aboutTexture, mouseRef }) {
  const svg        = useLoader(SVGLoader, "/models/fixed_R.svg");
  const { camera } = useThree();

  const shapes = useMemo(() =>
    svg.paths.flatMap((p) => SVGLoader.createShapes(p)),
  [svg]);

  const extrudeSettings = useMemo(() => ({
    depth:         1.5,
    bevelEnabled:  false,
    curveSegments: 64,
  }), []);

  const faceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color:       "#000000",
    roughness:   1.0,
    metalness:   0.0,
    side:        THREE.FrontSide,
    transparent: true,
    opacity:     1,
  }), []);

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color:             "#CC2200",
    roughness:         0.75,
    metalness:         0.0,
    emissive:          "#1a0000",
    emissiveIntensity: 0.8,
    side:              THREE.DoubleSide,
    transparent:       true,
    opacity:           1,
  }), []);

  useFrame(() => {
    const p = progress.current.value;
    const m = mouseRef?.current ?? { x: 0, y: 0 };

    camera.position.set(
      CAM_X + m.x * 0.15,
      CAM_Y - m.y * 0.15,
      CAM_START - p * CAM_TRAVEL
    );
    camera.lookAt(CAM_X, CAM_Y, GROUP_Z);

    const tunnelOpacity = 1 - gsap.utils.clamp(0, 1, (p - 0.92) / 0.07);
    faceMaterial.opacity = tunnelOpacity;
    wallMaterial.opacity = tunnelOpacity;
  });

  return (
    <>
      <ambientLight intensity={0.0} />
      <directionalLight position={[HOLE_X - 1.5, HOLE_Y + 0.5, GROUP_Z + 6]} intensity={4.0} color="#FF3300" />
      <directionalLight position={[HOLE_X + 1.5, HOLE_Y - 0.5, GROUP_Z + 6]} intensity={2.5} color="#CC2200" />
      <pointLight position={[HOLE_X, HOLE_Y, GROUP_Z + 0.3]} intensity={6} distance={1.5} color="#FF5500" decay={2} />

      <group scale={[0.01, -0.01, 1]} position={[-1.075, 1.23, GROUP_Z]}>
        {shapes.map((shape, i) => (
          <mesh key={i} material={[faceMaterial, faceMaterial, wallMaterial]}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
          </mesh>
        ))}
      </group>

      {aboutTexture && (
        <AboutPlane textureData={aboutTexture} progress={progress} mouseRef={mouseRef} />
      )}
    </>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
// Props:
//   phase             — 'forward' | 'hidden' | 'reverse'  (controlled by App)
//   onComplete        — called when the about-page dismiss fades out
//   onReverseComplete — called when reverse animation finishes
export const Landing = ({ phase, onComplete, onReverseComplete }) => {
  const [isDarkMode, setIsDarkMode]     = useState(false);
  const [aboutTexture, setAboutTexture] = useState(null);

  const MAX_PROGRESS   = 1;
  const FADE_THRESHOLD = 0.96;

  const landingWrapRef     = useRef(null);
  const containerRef       = useRef(null);
  const zoomContainerRef   = useRef(null);
  const vaTextRef          = useRef(null);
  const rTextRef           = useRef(null);
  const unTextRef          = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const fluidCanvasRef     = useRef(null);
  const fluidSimRef        = useRef(null);
  const canvasWrapperRef   = useRef(null);
  // captureRef — hidden off-screen, used ONLY for html2canvas → 3D texture
  const aboutCaptureRef    = useRef(null);
  const mouseRef           = useRef({ x: 0, y: 0 });
  const progress           = useRef({ value: 0 });
  const targetProgress     = useRef(0);
  const portalFiredRef     = useRef(false);
  const observerRef        = useRef(null);

  // ── dark mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? "#000000" : "#ffffff";
  }, [isDarkMode]);

  // ── fluid sim ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fluidCanvasRef.current) return;
    fluidSimRef.current = new FluidSimulation(fluidCanvasRef.current, FLUID_CONFIG);
  }, []);

  // ── mouse parallax ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  // ── html2canvas → 3D texture ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const capture = async () => {
      if (!aboutCaptureRef.current) return;
      // Wait two frames so fonts/images have loaded
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(aboutCaptureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        ignoreElements: (el) => el.tagName === "CANVAS",
      });
      if (cancelled) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      setAboutTexture({ texture, width: canvas.width, height: canvas.height });
    };
    capture();
    return () => { cancelled = true; };
  }, []);

  // ── dismiss: fade out whole landing, reveal Home ──────────────────────────
  const dismissToHome = () => {
    const wrap = landingWrapRef.current;
    if (!wrap) return;
    gsap.to(wrap, {
      opacity:  0,
      duration: 0.6,
      ease:     "power2.inOut",
      onComplete: () => {
        wrap.style.pointerEvents = "none";
        if (onComplete) onComplete();
      },
    });
  };

  // ── render frame (drives all opacity/scale via scroll progress) ───────────
  const renderFrame = () => {
    const p = progress.current.value;

    const scale        = 1 + p * 20;
    const textOpacity  = p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.15);
    const canvasOpacity = p < 0.60 ? 0 : Math.min(1, (p - 0.60) / 0.07);
    const rFlatOpacity = p < 0.38 ? 1 : Math.max(0, 1 - (p - 0.38) / 0.10);

    // About overlay removed — About content lives purely in the 3D plane inside the tunnel

    const ca         = Math.sin(p * Math.PI) * 3;
    const redShadow  = `${ca}px 0 0 rgba(255,0,0,0.5)`;
    const cyanShadow = `${-ca}px 0 0 rgba(0,255,255,0.5)`;
    const rGlow      = `0 0 ${20 + p * 30}px rgba(255,170,0,0.6)`;

    if (zoomContainerRef.current)
      gsap.set(zoomContainerRef.current, { scale, opacity: textOpacity });
    if (canvasWrapperRef.current)
      gsap.set(canvasWrapperRef.current, { opacity: canvasOpacity });

    if (vaTextRef.current)
      vaTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;
    if (unTextRef.current)
      unTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;
    if (rTextRef.current) {
      rTextRef.current.style.textShadow =
        `${ca * 1.5}px 0 0 rgba(255,0,0,0.6), ${-ca * 1.5}px 0 0 rgba(0,255,255,0.6), ${rGlow}`;
      gsap.set(rTextRef.current, { opacity: rFlatOpacity });
    }
    if (scrollIndicatorRef.current)
      gsap.set(scrollIndicatorRef.current, { opacity: p < 0.15 ? 1 - p / 0.15 : 0 });

    // Portal: tunnel is done — next scroll dismisses landing and reveals Home
    if (p >= FADE_THRESHOLD && !portalFiredRef.current) {
      portalFiredRef.current = true;

      if (observerRef.current) {
        observerRef.current.kill();
        observerRef.current = null;
      }

      document.body.style.overflow = "";
      document.body.style.height   = "";

      // Brief pause so the screen fully appears before accepting dismiss scroll
      setTimeout(() => {
        const onDismiss = () => {
          window.removeEventListener("wheel",      onDismiss);
          window.removeEventListener("touchstart", onDismiss);
          dismissToHome();
        };
        window.addEventListener("wheel",      onDismiss, { once: true });
        window.addEventListener("touchstart", onDismiss, { once: true });
      }, 600);
    }
  };

  // ── scroll observer (forward mode) ────────────────────────────────────────
  const startObserver = () => {
    if (observerRef.current) {
      observerRef.current.kill();
      observerRef.current = null;
    }
    observerRef.current = Observer.create({
      target:         window,
      type:           "wheel,touch,pointer",
      preventDefault: true,
      tolerance:      10,
      onChange: (self) => {
        if (portalFiredRef.current) return;
        const event         = self.event || {};
        const isTouchLike   = event.type?.startsWith("touch") || event.pointerType === "touch";
        const delta         = self.deltaY || self.velocityY;
        const sensitivity   = isTouchLike ? 0.004 : 0.0035;
        const adjustedDelta = isTouchLike ? -delta : delta;
        targetProgress.current = gsap.utils.clamp(
          0, MAX_PROGRESS,
          targetProgress.current + adjustedDelta * sensitivity
        );
        gsap.to(progress.current, {
          value:     targetProgress.current,
          duration:  0.3,
          overwrite: true,
          ease:      "power2.out",
          onUpdate:  renderFrame,
        });
      },
    });
  };

  // ── phase changes from App ─────────────────────────────────────────────────
  useEffect(() => {
    const wrap = landingWrapRef.current;
    if (!wrap) return;

    if (phase === "hidden") {
      wrap.style.pointerEvents = "none";
      return;
    }

    if (phase === "reverse") {
      wrap.style.pointerEvents = "auto";
      wrap.style.opacity       = "1";
      document.body.style.overflow = "hidden";
      document.body.style.height   = "100vh";

      progress.current.value = MAX_PROGRESS;
      targetProgress.current = MAX_PROGRESS;
      portalFiredRef.current = false;

      if (observerRef.current) { observerRef.current.kill(); observerRef.current = null; }

      gsap.to(progress.current, {
        value:    0,
        duration: 1.5,
        ease:     "power2.inOut",
        onUpdate: renderFrame,
        onComplete: () => { if (onReverseComplete) onReverseComplete(); },
      });
      return;
    }

    if (phase === "forward") {
      wrap.style.pointerEvents = "auto";
      wrap.style.opacity       = "1";
      progress.current.value   = 0;
      targetProgress.current   = 0;
      portalFiredRef.current   = false;
      document.body.style.overflow = "hidden";
      document.body.style.height   = "100vh";
      renderFrame();
      startObserver();
    }
  }, [phase]);

  // ── initial mount ──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    progress.current.value = 0;
    targetProgress.current = 0;
    portalFiredRef.current = false;
    document.body.style.overflow = "hidden";
    document.body.style.height   = "100vh";
    renderFrame();
    startObserver();
    return () => {
      if (observerRef.current) observerRef.current.kill();
      document.body.style.overflow = "";
      document.body.style.height   = "";
    };
  }, []);

  return (
    <div
      ref={landingWrapRef}
      style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "auto" }}
    >
      <Navbar />

      {/* ── Off-screen About snapshot — html2canvas only, never visible ── */}
      <div
        ref={aboutCaptureRef}
        aria-hidden="true"
        style={{ position: "fixed", left: "-99999px", top: 0, zIndex: -1 }}
      >
        <AboutPreview />
      </div>

      <div
        ref={containerRef}
        className="fixed inset-0 w-full h-screen overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: isDarkMode ? "#000000" : "#f9fafb",
          backfaceVisibility: "hidden",
          isolation: "isolate",
        }}
      >
        {/* Fluid canvas */}
        <canvas
          ref={fluidCanvasRef}
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100vh",
            zIndex: 40, pointerEvents: "none",
            mixBlendMode: "difference",
          }}
        />

        {/* 3D tunnel */}
        <div
          ref={canvasWrapperRef}
          style={{
            position: "absolute", inset: 0,
            zIndex: 17, opacity: 0,
            pointerEvents: "none",
          }}
        >
          <Canvas
            camera={{ position: [CAM_X, CAM_Y, CAM_START], fov: 50, near: 0.001, far: 1000 }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
            gl={{ alpha: true, antialias: true }}
          >
            <TunnelR progress={progress} aboutTexture={aboutTexture} mouseRef={mouseRef} />
          </Canvas>
        </div>

        {/* 2D VARUN zoom */}
        <div
          ref={zoomContainerRef}
          style={{
            willChange:    "transform, opacity",
            position:      "absolute",
            zIndex:        15,
            transformOrigin: "48% 32%",
            filter:        "contrast(1.1) brightness(1.05)",
          }}
        >
          <div className={`font-medium tracking-wide select-none absolute left-2 -top-14 md:-top-[3.5vw] text-lg md:text-[1.5vw] ${isDarkMode ? "text-white/80" : "text-black/80"}`}>
            Hey I'm{" "}
            <Typewriter
              text=""
              words={["a SWE", "an ML engineer", "an AI dev", "a creative coder"]}
              speed={120} deleteSpeed={100} pause={2350}
            />
          </div>

          <h1 className={`text-[20vw] font-black leading-none tracking-wide select-none flex font-Sinistre ${isDarkMode ? "text-white" : "text-black"}`}>
            <span ref={vaTextRef}>VA</span>
            <span ref={rTextRef} className="relative text-amber-500">R</span>
            <span ref={unTextRef}>UN</span>
          </h1>

          <div
            className={`font-medium tracking-wide select-none absolute right-2 -bottom-12 md:-bottom-[2.5vw] text-right text-lg md:text-[1.5vw] ${isDarkMode ? "text-white/80" : "text-black/80"}`}
            style={{ minWidth: "300px" }}
          >
            <Typewriter text="I love" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          ref={scrollIndicatorRef}
          style={{
            position:  "absolute", bottom: "2.5rem", left: "50%",
            transform: "translateX(-50%)", zIndex: 30,
            display:   "flex", flexDirection: "column",
            alignItems: "center", gap: "0.5rem",
          }}
        >
          <span className={`text-sm font-medium ${isDarkMode ? "text-white/50" : "text-black/50"}`}>
            Scroll to enter
          </span>
          <ArrowDown className={`w-5 h-5 animate-bounce ${isDarkMode ? "text-white/50" : "text-black/50"}`} />
        </div>
      </div>
    </div>
  );
};