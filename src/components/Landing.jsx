import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

// ─────────────────────────────────────────────
// ALL CAMERA CONSTANTS MUST STAY AT MODULE LEVEL
// (outside every function / component)
// ─────────────────────────────────────────────
const GROUP_Z    = -3.5;
const CAM_START  =  5.0;
const CAM_END    = -3.3;
const CAM_TRAVEL = CAM_START - CAM_END;   // 8.3

// Recalculated for fixed_R.svg  (viewBox 0 0 215 246)
// Counter centroid ≈ SVG (94.66, 61.49)
// World X = -1.075 + 94.66*0.01 = -0.128
// World Y =  1.230 - 61.49*0.01 =  0.615
const CAM_X  = -0.128;
const CAM_Y  =  0.615;
const HOLE_X = -0.128;
const HOLE_Y =  0.615;

// Where the About plane sits, just behind the tunnel's front face,
// so it reads as "inside" the hole rather than past the whole tunnel.
const ABOUT_Z = GROUP_Z - 1.6;

// World-space corners of the triangular hole in fixed_R.svg, used every
// frame to measure how big the hole currently looks on screen (so the
// About plane doesn't even start appearing until the hole is big enough).
// Derived from the SVG hole subpath coordinates run through the same
// group transform used to place the extruded R (scale 0.01,-0.01,1,
// position -1.075, 1.23, GROUP_Z).
const HOLE_TRI_WORLD = [
  new THREE.Vector3(-0.13915, 0.892795, GROUP_Z),
  new THREE.Vector3(-0.44915, 0.432795, GROUP_Z),
  new THREE.Vector3(0.22509, 0.425002, GROUP_Z),
];

// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Tilted plane textured with the captured About page snapshot.
// Visibility is gated by two independent factors each frame:
//   1) progressRamp — doesn't start until the hole's projected size
//      crosses ~60% of viewport height, then ramps 0→1 the rest of the way
//   2) angleFactor — how directly the camera is facing the plane, which
//      mouse movement subtly steers (mirrors the reference's "tilt away
//      and it disappears" trick)
// Near the very end of the scroll, angle is ignored so the tunnel can
// fully resolve into the About content regardless of mouse position.
// ─────────────────────────────────────────────
function AboutPlane({ textureData, progress, mouseRef }) {
  const meshRef     = useRef(null);
  const materialRef = useRef(null);
  const gateRef     = useRef({ opened: false, atProgress: 0 });
  const { camera }  = useThree();

  const { texture, width, height } = textureData;

  const planeHeight = 1.5;
  const planeWidth  = planeHeight * (width / height);

  useFrame(() => {
    const p = progress.current.value;

    // 1) Gate on projected hole size (NDC y-range of -1..1 means the
    // full viewport height is 2 units, so 60% of that is 1.2)
    let minY = Infinity, maxY = -Infinity;
    const v = new THREE.Vector3();
    for (const point of HOLE_TRI_WORLD) {
      v.copy(point).project(camera);
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const triNdcHeight = maxY - minY;

    if (!gateRef.current.opened && triNdcHeight >= 1.2) {
      gateRef.current.opened = true;
      gateRef.current.atProgress = p;
    }

    let progressRamp = 0;
    if (gateRef.current.opened) {
      const span = Math.max(0.0001, 1 - gateRef.current.atProgress);
      progressRamp = gsap.utils.clamp(0, 1, (p - gateRef.current.atProgress) / span);
    }

    if (meshRef.current) {
      // Mouse subtly steers the plane's tilt — base angle plus a small
      // mouse-driven offset, so panning right/left changes how "on-axis"
      // it looks, same spirit as the reference disappearing at an angle.
      const m = mouseRef?.current ?? { x: 0, y: 0 };
      meshRef.current.rotation.y = THREE.MathUtils.degToRad(18) + m.x * 0.6;
      meshRef.current.rotation.x = m.y * 0.25;

      // 2) Angle factor: alignment between camera view direction and the
      // plane's front-facing normal. ~1 when camera looks straight at it.
      const viewDir = new THREE.Vector3();
      camera.getWorldDirection(viewDir);
      const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(meshRef.current.quaternion);
      const alignment   = -viewDir.dot(planeNormal);
      const angleFactor = gsap.utils.clamp(0, 1, (alignment - 0.5) / (0.92 - 0.5));

      // 3) Near the very end, ignore angle entirely so the tunnel can
      // fully resolve into the About content no matter where the mouse is
      const nearEnd = gsap.utils.clamp(0, 1, (p - 0.93) / 0.06);

      const finalOpacity = Math.max(
        progressRamp * angleFactor,
        progressRamp * nearEnd
      );

      if (materialRef.current) materialRef.current.opacity = finalOpacity;
    }
  });

  return (
    <mesh ref={meshRef} position={[HOLE_X, HOLE_Y, ABOUT_Z]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
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

function TunnelR({ progress, aboutTexture, mouseRef }) {
  const svg      = useLoader(SVGLoader, "/models/fixed_R.svg");
  const { camera } = useThree();

  const shapes = useMemo(() => {
    return svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  }, [svg]);

  const extrudeSettings = useMemo(() => ({
    depth:         1.5,
    bevelEnabled:  false,
    curveSegments: 64,
  }), []);

  // Both materials are now transparent so the tunnel itself can fade out
  // near the end of the scroll, leaving only the About plane visible.
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

    // Subtle mouse-driven pan, on top of the scroll-driven dolly move.
    // This is what makes the About plane's angle (and therefore its
    // visibility) actually reactive to mouse position.
    camera.position.set(
      CAM_X + m.x * 0.15,
      CAM_Y - m.y * 0.15,
      CAM_START - p * CAM_TRAVEL
    );
    camera.lookAt(CAM_X, CAM_Y, GROUP_Z);

    // Fade the tunnel geometry out right at the end of the scroll
    const tunnelOpacity = 1 - gsap.utils.clamp(0, 1, (p - 0.92) / 0.07);
    faceMaterial.opacity = tunnelOpacity;
    wallMaterial.opacity = tunnelOpacity;
  });

  return (
    <>
      <ambientLight intensity={0.0} />
      <directionalLight
        position={[HOLE_X - 1.5, HOLE_Y + 0.5, GROUP_Z + 6]}
        intensity={4.0}
        color="#FF3300"
      />
      <directionalLight
        position={[HOLE_X + 1.5, HOLE_Y - 0.5, GROUP_Z + 6]}
        intensity={2.5}
        color="#CC2200"
      />
      <pointLight
        position={[HOLE_X, HOLE_Y, GROUP_Z + 0.3]}
        intensity={6}
        distance={1.5}
        color="#FF5500"
        decay={2}
      />
      {/* Centered for viewBox 215x246 at scale 0.01 */}
      <group
        scale={[0.01, -0.01, 1]}
        position={[-1.075, 1.23, GROUP_Z]}
      >
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

export const Landing = ({ playReverse = false, onReverseComplete }) => {
  const navigate    = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [aboutTexture, setAboutTexture] = useState(null);

  const MAX_PROGRESS       = 1;
  const NAVIGATE_THRESHOLD = 0.96;

  const containerRef       = useRef(null);
  const zoomContainerRef   = useRef(null);
  const vaTextRef          = useRef(null);
  const rTextRef           = useRef(null);
  const unTextRef          = useRef(null);
  const overlayRef         = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const fluidCanvasRef     = useRef(null);
  const fluidSimRef        = useRef(null);
  const canvasWrapperRef   = useRef(null);
  const aboutPreviewRef    = useRef(null);
  const mouseRef           = useRef({ x: 0, y: 0 });
  const progress           = useRef({ value: playReverse ? MAX_PROGRESS : 0 });
  const targetProgress     = useRef(playReverse ? MAX_PROGRESS : 0);
  const isNavigating       = useRef(false);
  const ctx                = useRef(null);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (playReverse) return;
    document.body.style.overflow = "hidden";
    document.body.style.height   = "100vh";
    return () => {
      document.body.style.overflow = "";
      document.body.style.height   = "";
    };
  }, [playReverse]);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? "#000000" : "#ffffff";
  }, [isDarkMode]);

  useEffect(() => {
    if (!fluidCanvasRef.current) return;
    fluidSimRef.current = new FluidSimulation(fluidCanvasRef.current, FLUID_CONFIG);
  }, []);

  // Track raw mouse position, normalized to [-1, 1] on both axes.
  useEffect(() => {
    const handleMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  // Capture the hidden About preview into a texture once, on mount.
  useEffect(() => {
    let cancelled = false;
    const capture = async () => {
      if (!aboutPreviewRef.current) return;
      // give layout/fonts a couple frames to settle before snapshotting
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
      const canvas = await html2canvas(aboutPreviewRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      if (cancelled) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      setAboutTexture({ texture, width: canvas.width, height: canvas.height });
    };
    capture();
    return () => { cancelled = true; };
  }, []);

  useLayoutEffect(() => {
    progress.current.value = playReverse ? MAX_PROGRESS : 0;
    targetProgress.current = playReverse ? MAX_PROGRESS : 0;
    isNavigating.current   = false;

    ctx.current = gsap.context(() => {
      const render = () => {
        const p = progress.current.value;

        const scale = 1 + p * 20;

        // 2D text: fully visible 0→0.42, fades 0.42→0.55
        const textOpacity = p < 0.42 ? 1 : Math.max(0, 1 - (p - 0.42) / 0.13);

        // 3D canvas: starts at 0.47, fully visible by 0.57
        // Crossfade zone 0.47-0.55 eliminates the dark gap
        const canvasOpacity = p < 0.47 ? 0 : Math.min(1, (p - 0.47) / 0.10);

        // Flat 2D R letter fades 0.35→0.47
        const rFlatOpacity = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.12);

        const overlayOpacity = p < 0.90 ? 0 : Math.min(1, (p - 0.90) / 0.08);

        const ca         = Math.sin(p * Math.PI) * 3;
        const redShadow  = `${ca}px 0 0 rgba(255,0,0,0.5)`;
        const cyanShadow = `${-ca}px 0 0 rgba(0,255,255,0.5)`;
        const rGlow      = `0 0 ${20 + p * 30}px rgba(255,170,0,0.6)`;

        if (zoomContainerRef.current)
          gsap.set(zoomContainerRef.current, { scale, opacity: textOpacity });
        if (overlayRef.current)
          gsap.set(overlayRef.current, { opacity: overlayOpacity });
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
        if (scrollIndicatorRef.current && !playReverse)
          gsap.set(scrollIndicatorRef.current, { opacity: p < 0.15 ? 1 - p / 0.15 : 0 });

        if (!playReverse && p >= NAVIGATE_THRESHOLD && !isNavigating.current) {
          isNavigating.current = true;
          setTimeout(() => navigate("/home"), 50);
        }
      };

      render();

      if (playReverse) {
        gsap.to(progress.current, {
          value: 0, duration: 1.5, ease: "power2.inOut",
          onUpdate: render,
          onComplete: () => { if (onReverseComplete) onReverseComplete(); },
        });
      } else {
        Observer.create({
          target: window,
          type: "wheel,touch,pointer",
          preventDefault: true,
          tolerance: 10,
          onChange: (self) => {
            if (isNavigating.current) return;
            const event      = self.event || {};
            const isTouchLike =
              event.type?.startsWith("touch") || event.pointerType === "touch";
            const delta        = self.deltaY || self.velocityY;
            const sensitivity  = isTouchLike ? 0.004 : 0.0035;
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
              onUpdate:  render,
            });
          },
        });
      }
    }, containerRef);

    return () => ctx.current.revert();
  }, [navigate, playReverse, onReverseComplete]);

  const zoomOrigin = "48% 32%";

  return (
    <>
      <Navbar />

      {/* Hidden, off-screen About content — only exists to be captured by
          html2canvas. Not display:none, since that would break layout
          measurement; instead pushed far off-screen. */}
      <div
        ref={aboutPreviewRef}
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
        <canvas
          ref={fluidCanvasRef}
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100vh",
            zIndex: 40, pointerEvents: "none",
            mixBlendMode: "difference",
          }}
        />

        <div
          ref={canvasWrapperRef}
          style={{
            position: "absolute", inset: 0,
            zIndex: 17,
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          <Canvas
            camera={{
              position: [CAM_X, CAM_Y, CAM_START],
              fov:  50,
              near: 0.001,
              far:  1000,
            }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
            gl={{ alpha: true, antialias: true }}
          >
            <TunnelR progress={progress} aboutTexture={aboutTexture} mouseRef={mouseRef} />
          </Canvas>
        </div>

        <div
          ref={zoomContainerRef}
          style={{
            willChange: "transform, opacity",
            position: "absolute", zIndex: 15,
            transformOrigin: zoomOrigin,
            filter: "contrast(1.1) brightness(1.05)",
          }}
        >
          <div
            className={`font-medium tracking-wide select-none absolute left-2 -top-14 md:-top-[3.5vw] text-lg md:text-[1.5vw] ${
              isDarkMode ? "text-white/80" : "text-black/80"
            }`}
          >
            Hey I'm{" "}
            <Typewriter
              text=""
              words={["a SWE", "an ML engineer", "an AI dev", "a creative coder"]}
              speed={120} deleteSpeed={100} pause={2350}
            />
          </div>

          <h1
            className={`text-[20vw] font-black leading-none tracking-wide select-none flex font-Sinistre ${
              isDarkMode ? "text-white" : "text-black"
            }`}
          >
            <span ref={vaTextRef}>VA</span>
            <span ref={rTextRef} className="relative text-amber-500">R</span>
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
            position: "absolute", inset: 0,
            zIndex: 20, pointerEvents: "none",
            backgroundColor: "#FFAA00",
            backfaceVisibility: "hidden",
            opacity: 0,
          }}
        />

        {!playReverse && (
          <div
            ref={scrollIndicatorRef}
            style={{
              position: "absolute", bottom: "2.5rem", left: "50%",
              transform: "translateX(-50%)", zIndex: 30,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "0.5rem",
            }}
          >
            <span className={`text-sm font-medium ${isDarkMode ? "text-white/50" : "text-black/50"}`}>
              Scroll to enter
            </span>
            <ArrowDown className={`w-5 h-5 animate-bounce ${isDarkMode ? "text-white/50" : "text-black/50"}`} />
          </div>
        )}
      </div>
    </>
  );
};